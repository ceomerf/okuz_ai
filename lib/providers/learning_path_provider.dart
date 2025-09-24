import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../models/learning_path_models.dart';
import '../services/api_client.dart';
import 'api_client_provider.dart';

// Provider tanımları
final learningPathProvider =
    StateNotifierProvider<LearningPathNotifier, LearningPathState>(
  (ref) => LearningPathNotifier(
    apiService: LearningPathApiService(ref.read(apiClientProvider)),
  ),
);

// Yeni provider - Stream için
final learningPathStreamProvider =
    StateNotifierProvider<LearningPathStreamNotifier, LearningPathStreamState>(
  (ref) => LearningPathStreamNotifier(
    apiService: LearningPathApiService(ref.read(apiClientProvider)),
  ),
);

// Geçmiş yollar için provider
final pathHistoryProvider = FutureProvider<List<PathHistory>>((ref) async {
  final apiService = ref.watch(learningPathProvider.notifier)._apiService;
  final result = await apiService.getPathHistory();
  return result;
});

// Durumları temsil eden sealed class
@immutable
sealed class LearningPathState {}

class LearningPathInitial extends LearningPathState {}

class LearningPathLoading extends LearningPathState {}

class LearningPathLoaded extends LearningPathState {
  final LearningPath path;
  final String pathId;

  LearningPathLoaded({required this.path, required this.pathId});
}

class LearningPathError extends LearningPathState {
  final String message;

  LearningPathError(this.message);
}

// Stream durumları için yeni state sınıfı
class LearningPathStreamState {
  final String? pathTitle;
  final String? totalEstimatedTime;
  final List<Milestone> milestones;
  final bool isLoading;
  final bool isComplete;
  final String? error;

  LearningPathStreamState({
    this.pathTitle,
    this.totalEstimatedTime,
    this.milestones = const [],
    this.isLoading = false,
    this.isComplete = false,
    this.error,
  });

  LearningPathStreamState copyWith({
    String? pathTitle,
    String? totalEstimatedTime,
    List<Milestone>? milestones,
    bool? isLoading,
    bool? isComplete,
    String? error,
  }) {
    return LearningPathStreamState(
      pathTitle: pathTitle ?? this.pathTitle,
      totalEstimatedTime: totalEstimatedTime ?? this.totalEstimatedTime,
      milestones: milestones ?? this.milestones,
      isLoading: isLoading ?? this.isLoading,
      isComplete: isComplete ?? this.isComplete,
      error: error ?? this.error,
    );
  }
}

class LearningPathNotifier extends StateNotifier<LearningPathState> {
  final LearningPathApiService _apiService;

  LearningPathNotifier({required LearningPathApiService apiService})
      : _apiService = apiService,
        super(LearningPathInitial());

  Future<void> generatePath({
    required String goal,
    required String currentLevel,
  }) async {
    state = LearningPathLoading();
    try {
      final response = await _apiService.generatePath(
        goal: goal,
        currentLevel: currentLevel,
      );
      state = LearningPathLoaded(
          path: response.pathData, pathId: response.learningPathId);
    } catch (e) {
      state = LearningPathError(e.toString());
    }
  }

  void resetState() {
    state = LearningPathInitial();
  }
}

// Stream için yeni notifier
class LearningPathStreamNotifier
    extends StateNotifier<LearningPathStreamState> {
  final LearningPathApiService _apiService;
  StreamSubscription? _subscription;

  LearningPathStreamNotifier({required LearningPathApiService apiService})
      : _apiService = apiService,
        super(LearningPathStreamState());

  Future<void> generatePathStream({
    required String goal,
    required String currentLevel,
  }) async {
    state = LearningPathStreamState(isLoading: true);
    _subscription?.cancel(); // Önceki dinlemeyi iptal et

    try {
      final stream = _apiService.getPathStream(
        goal: goal,
        currentLevel: currentLevel,
      );

      _subscription = stream.listen(
        (event) {
          // Gelen her bir event'i işle
          final type = event['type'];
          final data = event['data'];

          if (type == 'PATH_INFO') {
            state = state.copyWith(
              pathTitle: data['pathTitle'],
              totalEstimatedTime: data['totalEstimatedTime'],
            );
          } else if (type == 'MILESTONE') {
            final newMilestone = Milestone.fromJson(data);
            state = state.copyWith(
              milestones: [...state.milestones, newMilestone],
            );
          } else if (event['status'] == 'COMPLETE') {
            state = state.copyWith(isLoading: false, isComplete: true);
          }
        },
        onError: (e) {
          state = state.copyWith(
            isLoading: false,
            error:
                'Öğrenme yolu oluşturulurken bir hata oluştu: ${e.toString()}',
          );
        },
        onDone: () {
          state = state.copyWith(isLoading: false, isComplete: true);
        },
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Öğrenme yolu stream başlatılırken hata: ${e.toString()}',
      );
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

class LearningPathApiService {
  final ApiClient _apiClient;
  LearningPathApiService(this._apiClient);

  Future<({String learningPathId, LearningPath pathData})> generatePath({
    required String goal,
    required String currentLevel,
  }) async {
    try {
      print('🚀 LearningPathProvider: generatePath başlatıldı');
      print('📝 LearningPathProvider: Goal: $goal, Level: $currentLevel');
      
      final response =
          await _apiClient.post('/smart-tools/learning-path', {
        'topic': goal,
        'level': currentLevel,
        'goals': [goal],
      });

      print('✅ LearningPathProvider: API yanıtı alındı: $response');

      if (response['success'] != true) {
        throw Exception(
            'API yanıtı başarısız: ${response['message'] ?? 'Bilinmeyen hata'}');
      }

      // Backend'den gelen response'da learningPath nested olarak geliyor
      final learningPathData = response['learningPath']['learningPath'] ?? response['learningPath'];
      print('🔍 LearningPathProvider: LearningPathData: $learningPathData');
      
      final pathData = LearningPath.fromJson(learningPathData);
      final String pathId = DateTime.now().millisecondsSinceEpoch.toString();

      print('✅ LearningPathProvider: Path başarıyla oluşturuldu');
      return (learningPathId: pathId, pathData: pathData);
    } catch (e) {
      print('❌ LearningPathProvider: Hata: $e');
      throw Exception('Öğrenme yolu oluşturma hatası: $e');
    }
  }

  // Geçmiş yolları listele - Bu endpoint backend'de mevcut değil, boş liste döndür
  Future<List<PathHistory>> getPathHistory() async {
    try {
      // Backend'de bu endpoint mevcut değil, geçici olarak boş liste döndür
      return [];
    } catch (e) {
      throw Exception('Öğrenme yolu geçmişi alma hatası: $e');
    }
  }

  // Yeni stream metodu
  Stream<dynamic> getPathStream({
    required String goal,
    required String currentLevel,
  }) {
    try {
      // SSE bağlantısı için URL - Bu endpoint backend'de mevcut değil
      final uri = Uri.parse(
          '${ApiClient.baseUrl}/smart-tools/learning-path');

      // HTTP istek başlıkları
      final headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      };

      // Secure storage for JWT
      final secureStorage = FlutterSecureStorage();

      // Yetkilendirme token'ı için asenkron bir işlev
      Future<void> addAuthHeader() async {
        final token = await secureStorage.read(key: 'jwt_token');
        if (token != null) {
          headers['Authorization'] = 'Bearer $token';
        }
      }

      // İstek gövdesi
      final body = jsonEncode({
        'goal': goal,
        'currentLevel': currentLevel,
      });

      // SSE bağlantısı oluştur ve stream'i döndür
      return Future.value(addAuthHeader()).asStream().asyncExpand((_) {
        final request = http.Request('POST', uri);
        request.headers.addAll(headers);
        request.body = body;

        return Stream.fromFuture(http.Client().send(request))
            .asyncExpand((response) {
              if (response.statusCode != 200) {
                throw Exception(
                    'SSE bağlantısı başarısız: ${response.statusCode}');
              }
              return response.stream;
            })
            .transform(utf8.decoder)
            .transform(const LineSplitter())
            .where((line) => line.startsWith('data: '))
            .map((line) => line.substring(6)) // "data: " prefix'ini kaldır
            .map((dataString) => jsonDecode(dataString)); // JSON'a dönüştür
      });
    } catch (e) {
      throw Exception('Stream başlatılırken hata: ${e.toString()}');
    }
  }
}
