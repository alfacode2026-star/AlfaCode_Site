# إصلاح مشكلة Lock Timeout (Zombie Locks)

## المشكلة
عندما يتعطل المتصفح أو يتم تحديث الصفحة أثناء وجود قفل نشط (lock)، يبقى القفل في localStorage إلى الأبد (Zombie Lock). عند محاولة المستخدم مرة أخرى، يحصل على خطأ "Lock timeout for resource...".

## السبب الجذري
- القفلات كانت تُخزن بدون وقت انتهاء (TTL)
- لا يوجد آلية لتنظيف القفلات المنتهية الصلاحية
- عند تعطل المتصفح، لا يتم إطلاق القفل تلقائياً

## الإصلاحات المطبقة

### 1. ✅ إضافة TTL (Time To Live) للقفلات

**قبل:**
```javascript
this.locks.set(resourceKey, Date.now()) // فقط timestamp
```

**بعد:**
```javascript
const lockData = {
  locked: true,
  expiresAt: Date.now() + this.LOCK_TTL, // 5 ثواني
  resourceKey: resourceKey,
  timestamp: Date.now()
}
this.locks.set(resourceKey, lockData)
```

### 2. ✅ التحقق من انتهاء الصلاحية في `acquireLock`

```javascript
// التحقق من القفل في الذاكرة
const memoryLock = this.locks.get(resourceKey)
if (memoryLock && !this.isLockExpired(memoryLock)) {
  // القفل نشط وغير منتهي، انتظر
} else {
  // القفل منتهي أو غير موجود، احصل عليه
}

// التحقق من القفل في localStorage
const storedLock = localStorage.getItem(lockStorageKey)
if (storedLock) {
  const lockData = JSON.parse(storedLock)
  if (this.isLockExpired(lockData)) {
    // القفل منتهي، احذفه واحصل على قفل جديد
    localStorage.removeItem(lockStorageKey)
  }
}
```

### 3. ✅ دالة تنظيف القفلات المنتهية

```javascript
cleanupExpiredLocks() {
  // تنظيف من الذاكرة
  for (const [resourceKey, lockData] of this.locks.entries()) {
    if (this.isLockExpired(lockData)) {
      this.locks.delete(resourceKey)
    }
  }
  
  // تنظيف من localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('lock_')) {
      const lockData = JSON.parse(localStorage.getItem(key))
      if (this.isLockExpired(lockData)) {
        localStorage.removeItem(key)
      }
    }
  }
}
```

### 4. ✅ تنظيف تلقائي عند بدء التطبيق

في `App.tsx`:
```javascript
useEffect(() => {
  // تنظيف عند تحميل التطبيق
  transactionManager.cleanupExpiredLocks()
  
  // تنظيف دوري كل 10 ثواني
  const cleanupInterval = setInterval(() => {
    transactionManager.cleanupExpiredLocks()
  }, 10000)
  
  // تنظيف عند إغلاق الصفحة
  window.addEventListener('beforeunload', () => {
    transactionManager.cleanupExpiredLocks()
  })
  
  return () => {
    clearInterval(cleanupInterval)
  }
}, [])
```

### 5. ✅ زيادة Timeout إلى 3000ms

```javascript
// قبل: timeout = 5000ms
async acquireLock(resourceKey, timeout = 5000)

// بعد: timeout = 3000ms (كما طُلب)
async acquireLock(resourceKey, timeout = 3000)
```

### 6. ✅ دالة إطلاق القفل القسري (للطوارئ)

```javascript
forceReleaseAllLocks() {
  // مسح جميع القفلات من الذاكرة و localStorage
  this.locks.clear()
  // ... تنظيف localStorage
}
```

## الميزات الجديدة

### 1. **Auto-Expiry (TTL)**
- كل قفل له وقت انتهاء: 5 ثواني
- القفلات المنتهية تُعتبر غير صالحة تلقائياً

### 2. **Force Release**
- عند محاولة الحصول على قفل منتهي، يتم حذفه تلقائياً
- لا حاجة لانتظار timeout

### 3. **Startup Cleanup**
- تنظيف تلقائي عند بدء التطبيق
- تنظيف دوري كل 10 ثواني
- تنظيف عند إغلاق الصفحة

### 4. **Cross-Tab Awareness**
- القفلات تُخزن في localStorage للوعي عبر التبويبات
- تنظيف القفلات المنتهية يعمل عبر جميع التبويبات

## هيكل القفل

```javascript
{
  locked: true,
  expiresAt: 1234567890123,  // timestamp + 5000ms
  resourceKey: "erp_inventory_products",
  timestamp: 1234567890123
}
```

## التدفق

### عند الحصول على قفل:
1. تنظيف القفلات المنتهية أولاً
2. التحقق من وجود قفل نشط
3. إذا كان القفل منتهياً → حذفه والحصول على قفل جديد
4. إذا كان القفل نشطاً → انتظار حتى يتم إطلاقه
5. عند الحصول على القفل → حفظه مع TTL

### عند إطلاق قفل:
1. حذف من الذاكرة
2. حذف من localStorage

### تنظيف دوري:
1. كل 10 ثواني: تنظيف القفلات المنتهية
2. عند بدء التطبيق: تنظيف شامل
3. عند إغلاق الصفحة: تنظيف نهائي

## النتيجة

- ✅ لا مزيد من Zombie Locks
- ✅ القفلات تنتهي تلقائياً بعد 5 ثواني
- ✅ تنظيف تلقائي عند بدء التطبيق
- ✅ تنظيف دوري كل 10 ثواني
- ✅ Force release للقفلات المنتهية
- ✅ Cross-tab awareness

## الاختبار

للتحقق من الإصلاح:
1. افتح التطبيق
2. افتح Console
3. يجب أن ترى: `Cleaned up X expired lock(s)` (إن وجدت)
4. حاول إضافة/تحديث منتج
5. يجب أن يعمل بدون أخطاء "Lock timeout"

إذا ظهرت مشكلة:
- افتح Console
- ابحث عن رسائل "Cleaned up" أو "Lock timeout"
- يمكن استدعاء `transactionManager.forceReleaseAllLocks()` يدوياً
