# Flutter Performance Optimization Guide

Bu rehber, Flutter uygulamasında performans optimizasyonu için kullanılan teknikleri açıklar.

## 🚀 Widget Performans Optimizasyonu

### 1. Const Constructor Kullanımı

**Kötü Örnek:**
```dart
class MyWidget extends StatelessWidget {
  final String title;
  
  MyWidget({required this.title}); // const constructor yok
  
  @override
  Widget build(BuildContext context) {
    return Text(title);
  }
}
```

**İyi Örnek:**
```dart
class MyWidget extends StatelessWidget {
  final String title;
  
  const MyWidget({required this.title}); // const constructor var
  
  @override
  Widget build(BuildContext context) {
    return Text(title);
  }
}
```

### 2. Widget Splitting

**Kötü Örnek:**
```dart
class LargeWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 100+ satır kod
        Container(/* ... */),
        Row(/* ... */),
        ListView(/* ... */),
        // daha fazla widget
      ],
    );
  }
}
```

**İyi Örnek:**
```dart
class LargeWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const _HeaderWidget(),
        const _ContentWidget(),
        const _FooterWidget(),
      ],
    );
  }
}

class _HeaderWidget extends StatelessWidget {
  const _HeaderWidget();
  
  @override
  Widget build(BuildContext context) {
    return Container(/* ... */);
  }
}
```

### 3. ListView.builder Kullanımı

**Kötü Örnek:**
```dart
ListView(
  children: items.map((item) => ListTile(title: Text(item))).toList(),
)
```

**İyi Örnek:**
```dart
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ListTile(title: Text(items[index]));
  },
)
```

## 🔄 Riverpod State Management Optimizasyonu

### 1. Select Metodu Kullanımı

**Kötü Örnek:**
```dart
class MyWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userProvider); // Tüm user objesi değiştiğinde rebuild
    return Text(user.name);
  }
}
```

**İyi Örnek:**
```dart
class MyWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userName = ref.watch(userProvider.select((user) => user.name));
    return Text(userName);
  }
}
```

### 2. Optimized Provider'lar

```dart
// Ana provider
final userProvider = StateNotifierProvider<UserNotifier, User>((ref) {
  return UserNotifier();
});

// Optimized selectors
final userNameProvider = Provider<String>((ref) {
  return ref.watch(userProvider.select((user) => user.name));
});

final userEmailProvider = Provider<String>((ref) {
  return ref.watch(userProvider.select((user) => user.email));
});
```

### 3. AutoDispose Kullanımı

```dart
// Geçici veriler için autoDispose kullan
final temporaryDataProvider = Provider.autoDispose<String>((ref) {
  return 'Temporary data';
});

// Family provider'lar için autoDispose
final userDataProvider = Provider.family.autoDispose<UserData, String>((ref, userId) {
  return UserData(id: userId);
});
```

## 📊 Performance Monitoring

### 1. Performance Utils Kullanımı

```dart
// Performance monitoring
PerformanceMonitor.startTiming('operation');
// ... işlem
final duration = PerformanceMonitor.endTiming('operation');

// Memoized widget
PerformanceUtils.memoizedWidget(
  dependencies: [dependency1, dependency2],
  builder: () => MyWidget(),
);
```

### 2. Optimized List View

```dart
OptimizedListView(
  items: items,
  itemBuilder: (context, index, item) {
    return OptimizedListItem(
      title: item.title,
      subtitle: item.subtitle,
      icon: item.icon,
    );
  },
);
```

## 🎯 Best Practices

### 1. Widget Hierarchy
- Büyük widget'ları küçük parçalara böl
- Const constructor'ları kullan
- Gereksiz rebuild'leri önle

### 2. State Management
- Select metodunu kullan
- AutoDispose provider'ları tercih et
- Family provider'ları kullan

### 3. List Performance
- ListView.builder kullan
- GridView.builder kullan
- Lazy loading uygula

### 4. Memory Management
- Unused provider'ları temizle
- AutoDispose kullan
- Memory leak'leri önle

## 🔧 Performance Tools

### 1. Flutter DevTools
```bash
# DevTools'u aç
flutter run --profile
# DevTools'da "Highlight Rebuilds" özelliğini aç
```

### 2. Performance Monitoring
```dart
// Widget rebuild'lerini izle
class PerformanceWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    print('Widget rebuilt: ${DateTime.now()}');
    return Container();
  }
}
```

### 3. Memory Profiling
```bash
# Memory profiling
flutter run --profile
# DevTools'da "Memory" tab'ını kullan
```

## 📈 Performance Metrics

### 1. Frame Rate
- 60 FPS hedefle
- Jank'leri önle
- Smooth scrolling sağla

### 2. Memory Usage
- Memory leak'leri önle
- Unused object'leri temizle
- Efficient data structures kullan

### 3. Build Time
- Const constructor'ları kullan
- Gereksiz rebuild'leri önle
- Widget splitting uygula

## 🚨 Common Pitfalls

### 1. Gereksiz Rebuild'ler
```dart
// Kötü: Tüm widget rebuild olur
final user = ref.watch(userProvider);
Text(user.name);

// İyi: Sadece name değiştiğinde rebuild olur
final name = ref.watch(userProvider.select((user) => user.name));
Text(name);
```

### 2. Büyük Widget'lar
```dart
// Kötü: 500+ satır build metodu
class HugeWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // 500+ satır kod
  }
}

// İyi: Küçük widget'lara böl
class HugeWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const _HeaderSection(),
        const _ContentSection(),
        const _FooterSection(),
      ],
    );
  }
}
```

### 3. Inefficient Lists
```dart
// Kötü: Tüm liste render edilir
ListView(children: items.map(...).toList())

// İyi: Sadece görünen item'lar render edilir
ListView.builder(itemCount: items.length, itemBuilder: ...)
```

## 📚 Resources

- [Flutter Performance Best Practices](https://docs.flutter.dev/perf/best-practices)
- [Riverpod Documentation](https://riverpod.dev/)
- [Flutter DevTools](https://docs.flutter.dev/development/tools/devtools)
- [Widget Performance](https://docs.flutter.dev/perf/rendering/best-practices)
