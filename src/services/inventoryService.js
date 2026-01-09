import { supabase } from './supabaseClient';
import tenantStore from './tenantStore';
import { validateTenantId } from '../utils/tenantValidation';

class InventoryService {
  /**
   * Get industry prefix based on tenant's industry_type
   * Fetches industry_type from tenants table, with fallback to mapping
   * Maps: 'retail' → 'RET-', 'engineering' → 'ENG-', 'services' → 'SRV-'
   */
  async getIndustryPrefix(tenantId) {
    if (!tenantId) {
      return 'PROD-'; // Default fallback
    }

    try {
      // Try to fetch industry_type from tenants table
      const { data, error } = await supabase
        .from('tenants')
        .select('industry_type')
        .eq('id', tenantId)
        .single();

      if (!error && data && data.industry_type) {
        // Map industry_type to prefix
        const industryTypeMap = {
          'retail': 'RET-',
          'engineering': 'ENG-',
          'services': 'SRV-'
        };
        
        const prefix = industryTypeMap[data.industry_type.toLowerCase()];
        if (prefix) {
          return prefix;
        }
      }
    } catch (error) {
      // If tenants table doesn't exist or query fails, use fallback
      console.warn('Could not fetch industry_type from tenants table, using fallback:', error.message);
    }

    // Fallback: Use hardcoded mapping for known tenants
    const fallbackMap = {
      '00000000-0000-0000-0000-000000000001': 'RET-', // شركة أ - retail
      '00000000-0000-0000-0000-000000000002': 'ENG-', // شركة ب - engineering
      '00000000-0000-0000-0000-000000000003': 'SRV-', // شركة ج - services
    };
    
    return fallbackMap[tenantId] || 'PROD-';
  }

  /**
   * Generate a unique SKU for the current tenant
   * Format: {INDUSTRY_PREFIX}{RANDOM_5_DIGITS} (e.g., RET-12345, ENG-67890, SRV-11111)
   * Uses tenant_id from TenantContext (UUID) and industry_type for prefix
   */
  async generateUniqueSKU() {
    const tenantId = tenantStore.getTenantId();
    if (!tenantId) {
      throw new Error('No tenant ID set. Cannot generate SKU.');
    }

    // Fetch industry prefix (includes tenant_id check)
    const prefix = await this.getIndustryPrefix(tenantId);
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Generate random 5-digit number
      const randomSequence = Math.floor(10000 + Math.random() * 90000).toString();
      const sku = `${prefix}${randomSequence}`;

      // Check if SKU already exists for this tenant (MUST include tenant_id filter)
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('tenant_id', tenantId) // Critical: filter by tenant_id to avoid false duplicates
        .eq('sku', sku)
        .limit(1);

      if (error) {
        console.error('Error checking SKU uniqueness:', error);
        throw error;
      }

      // If SKU doesn't exist for this tenant, return it
      if (!data || data.length === 0) {
        return sku;
      }

      attempts++;
    }

    // Fallback: use timestamp if all attempts fail
    const timestamp = Date.now().toString().slice(-5);
    return `${prefix}${timestamp}`;
  }

  /**
   * Check if SKU is unique within the current tenant
   */
  async isSKUUnique(sku, excludeProductId = null) {
    const tenantId = tenantStore.getTenantId();
    if (!tenantId) {
      return false;
    }

    let query = supabase
      .from('products')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('sku', sku);

    if (excludeProductId) {
      query = query.neq('id', excludeProductId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error('Error checking SKU uniqueness:', error);
      return false;
    }

    return !data || data.length === 0;
  }
  
  // جلب جميع المنتجات من السحابة (filtered by tenant)
  async getProducts() {
    try {
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch products.');
        return [];
      }

      // Supabase يرجع البيانات مرتبة حسب الأحدث
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId) // Filter by tenant
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error.message);
      return [];
    }
  }

  // جلب منتج واحد (with tenant check)
  async getProduct(id) {
    try {
      if (!id) return null;

      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch product.');
        return null;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId) // Filter by tenant
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching product:', error.message);
      return null;
    }
  }

  /**
   * تعديل كمية المنتج بقيمة فرق محددة
   * @param {string} productId - معرف المنتج
   * @param {number} delta - الفرق في الكمية (+ لإضافة، - للخصم)
   * @param {string} [reason] - سبب التعديل (اختياري)
   */
  async adjustQuantity(productId, delta, reason = 'adjust') {
    try {
      if (!productId || typeof delta !== 'number') {
        return { success: false, error: 'بيانات غير صالحة' }
      }
      
      const product = await this.getProduct(productId)
      if (!product) {
        return { success: false, error: 'المنتج غير موجود' }
      }

      const newQuantity = Math.max(0, (parseInt(product.quantity) || 0) + delta)
      const update = await this.updateProduct(productId, { quantity: newQuantity })
      if (!update.success) return update

      return { success: true, product: update.product }
    } catch (error) {
      console.error('Error adjusting quantity:', error.message)
      return { success: false, error: error.message || 'فشل تعديل الكمية' }
    }
  }

  // إضافة منتج جديد (with tenant_id)
  async addProduct(productData) {
    try {
      const tenantId = tenantStore.getTenantId();
      const tenantValidation = validateTenantId(tenantId);
      if (!tenantValidation.valid) {
        return {
          success: false,
          error: tenantValidation.error || 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        };
      }

      // Auto-generate SKU if empty
      let sku = productData.sku?.trim();
      if (!sku) {
        sku = await this.generateUniqueSKU();
      } else {
        // Validate SKU uniqueness if provided
        const isUnique = await this.isSKUUnique(sku);
        if (!isUnique) {
          return {
            success: false,
            error: 'SKU موجود مسبقاً في هذه الشركة',
            errorCode: 'DUPLICATE_SKU'
          };
        }
      }

      // إصلاح الخطأ: توليد ID إذا لم يكن موجوداً
      // نستخدم Timestamp لضمان رقم فريد مثل: PROD-17099999
      const generatedId = productData.id || `PROD-${Date.now()}`;

      const newProduct = {
        ...productData,
        id: generatedId, // <--- هنا كان النقص
        sku: sku, // Use generated or provided SKU
        tenant_id: tenantId, // Include tenant_id
        purchasePrice: parseFloat(productData.purchasePrice) || 0,
        sellingPrice: parseFloat(productData.sellingPrice) || 0,
        quantity: parseInt(productData.quantity) || 0,
        minQuantity: parseInt(productData.minQuantity) || 0,
        maxQuantity: parseInt(productData.maxQuantity) || 0,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        _version: 1
      };

      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();

      if (error) {
        // Handle duplicate SKU constraint violation
        if (error.code === '23505') {
          // Check if it's specifically the SKU constraint
          const errorMessage = error.message || '';
          if (errorMessage.includes('products_sku_tenant_unique') || errorMessage.includes('sku') || errorMessage.includes('SKU')) {
            return {
              success: false,
              error: 'SKU موجود مسبقاً في هذه الشركة. يرجى استخدام SKU آخر.',
              errorCode: 'DUPLICATE_SKU'
            };
          }
          // Generic unique constraint violation
          return {
            success: false,
            error: 'قيمة موجودة مسبقاً. يرجى التحقق من البيانات.',
            errorCode: 'DUPLICATE_VALUE'
          };
        }
        throw error;
      }

      return { success: true, product: data };
    } catch (error) {
      console.error('Error adding product:', error.message);
      // Handle duplicate SKU constraint violation from catch block
      if (error.code === '23505') {
        const errorMessage = error.message || '';
        if (errorMessage.includes('products_sku_tenant_unique') || errorMessage.includes('sku') || errorMessage.includes('SKU')) {
          return {
            success: false,
            error: 'SKU موجود مسبقاً في هذه الشركة. يرجى استخدام SKU آخر.',
            errorCode: 'DUPLICATE_SKU'
          };
        }
      }
      return { 
        success: false, 
        error: error.message || 'فشل في إضافة المنتج',
        errorCode: error.code === '23505' ? 'DUPLICATE_SKU' : 'ADD_FAILED'
      };
    }
  }

  // تحديث منتج (with tenant check)
  async updateProduct(id, updates) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف المنتج مطلوب',
          errorCode: 'INVALID_ID'
        };
      }

      const tenantId = tenantStore.getTenantId();
      const tenantValidation = validateTenantId(tenantId);
      if (!tenantValidation.valid) {
        return {
          success: false,
          error: tenantValidation.error || 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        };
      }

      // Check SKU uniqueness if SKU is being updated
      if (updates.sku !== undefined) {
        const sku = updates.sku?.trim();
        if (sku) {
          const isUnique = await this.isSKUUnique(sku, id);
          if (!isUnique) {
            return {
              success: false,
              error: 'SKU موجود مسبقاً في هذه الشركة',
              errorCode: 'DUPLICATE_SKU'
            };
          }
        } else {
          // Auto-generate SKU if empty
          updates.sku = await this.generateUniqueSKU();
        }
      }

      const { data, error } = await supabase
        .from('products')
        .update({
          ...updates,
          lastUpdated: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId) // Ensure tenant match
        .select()
        .single();

      if (error) {
        // Handle duplicate SKU constraint violation
        if (error.code === '23505') {
          const errorMessage = error.message || '';
          if (errorMessage.includes('products_sku_tenant_unique') || errorMessage.includes('sku') || errorMessage.includes('SKU')) {
            return {
              success: false,
              error: 'SKU موجود مسبقاً في هذه الشركة. يرجى استخدام SKU آخر.',
              errorCode: 'DUPLICATE_SKU'
            };
          }
          return {
            success: false,
            error: 'قيمة موجودة مسبقاً. يرجى التحقق من البيانات.',
            errorCode: 'DUPLICATE_VALUE'
          };
        }
        throw error;
      }

      if (!data) {
        return {
          success: false,
          error: 'المنتج غير موجود',
          errorCode: 'PRODUCT_NOT_FOUND'
        };
      }

      return { success: true, product: data };
    } catch (error) {
      console.error('Error updating product:', error.message);
      // Handle duplicate SKU constraint violation from catch block
      if (error.code === '23505') {
        const errorMessage = error.message || '';
        if (errorMessage.includes('products_sku_tenant_unique') || errorMessage.includes('sku') || errorMessage.includes('SKU')) {
          return {
            success: false,
            error: 'SKU موجود مسبقاً في هذه الشركة. يرجى استخدام SKU آخر.',
            errorCode: 'DUPLICATE_SKU'
          };
        }
      }
      return { 
        success: false, 
        error: error.message || 'فشل في تحديث المنتج',
        errorCode: error.code === '23505' ? 'DUPLICATE_SKU' : 'UPDATE_FAILED'
      };
    }
  }

  // حذف منتج (with tenant check)
  async deleteProduct(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف المنتج مطلوب',
          errorCode: 'INVALID_ID'
        };
      }

      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        return {
          success: false,
          error: 'معرف المستأجر مطلوب',
          errorCode: 'NO_TENANT_ID'
        };
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId); // Ensure tenant match

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting product:', error.message);
      return { success: false, error: error.message };
    }
  }

  // البحث (Supabase يدعم البحث النصي البسيط) (with tenant filter)
  async searchProducts(query) {
    if (!query) return this.getProducts();
    
    try {
      const tenantId = tenantStore.getTenantId();
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot search products.');
        return [];
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId) // Filter by tenant
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`); // ilike تعني بحث غير حساس لحالة الأحرف

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching:', error.message);
      return [];
    }
  }

  // الإحصائيات (سنحسبها في الواجهة مؤقتاً بعد جلب البيانات لتقليل تعقيد الكود)
  async getInventoryStats() {
    const products = await this.getProducts();
    return {
      totalProducts: products.length,
      totalValue: products.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0),
      lowStockCount: products.filter(p => p.quantity <= p.minQuantity).length,
      outOfStockCount: products.filter(p => p.quantity === 0).length,
      totalItems: products.reduce((sum, p) => sum + p.quantity, 0)
    };
  }

    // جلب المنتجات منخفضة المخزون
  async getLowStockProducts() {
     try {
      // في SQL الحقيقي، هذا الاستعلام معقد قليلاً لأن minQuantity متغير
      // للتبسيط الآن، نجلب الكل ونفلتر في الجافاسكريبت
      const products = await this.getProducts();
      return products.filter(p => p.quantity <= p.minQuantity);
    } catch (error) {
      return [];
    }
  }
}

const inventoryService = new InventoryService();
export default inventoryService;