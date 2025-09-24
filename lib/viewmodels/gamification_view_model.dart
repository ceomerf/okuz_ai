import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/gamification.dart';
import '../services/gamification_service.dart';
import '../providers/gamification_service_provider.dart';

// 1. Üç ayrı modelden gelen veriyi tutacak tekil bir model oluşturuyoruz.
class GamificationScreenModel {
  final GamificationProgress progress;
  final LevelInfo levelInfo;
  final EnergyStatus energyStatus;

  GamificationScreenModel({
    required this.progress,
    required this.levelInfo,
    required this.energyStatus,
  });
}

// 2. State'i yönetecek ViewModel'i oluşturuyoruz.
class GamificationState {
  final bool isLoading;
  final String? errorMessage;
  final GamificationScreenModel? data;
  const GamificationState({this.isLoading = true, this.errorMessage, this.data});

  GamificationState copyWith({bool? isLoading, String? errorMessage, GamificationScreenModel? data}) {
    return GamificationState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      data: data ?? this.data,
    );
  }
}

class GamificationNotifier extends StateNotifier<GamificationState> {
  final GamificationService _gamificationService;
  GamificationNotifier(this._gamificationService)
      : super(const GamificationState());

  Future<void> fetchGamificationData() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final results = await Future.wait([
        _gamificationService.getProgress(),
        _gamificationService.getLevelInfo(),
        _gamificationService.getEnergyStatus(),
      ]);
      state = state.copyWith(
        isLoading: false,
        data: GamificationScreenModel(
          progress: results[0] as GamificationProgress,
          levelInfo: results[1] as LevelInfo,
          energyStatus: results[2] as EnergyStatus,
        ),
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Veriler yüklenirken bir hata oluştu: $e');
    }
  }
}

final gamificationNotifierProvider = StateNotifierProvider<GamificationNotifier, GamificationState>((ref) {
  final service = ref.read(gamificationServiceProvider);
  return GamificationNotifier(service);
});
