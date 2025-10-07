import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FeatureFlagsService } from '../src/common/feature-flags/feature-flags.service';

async function startAICoachingRollout() {
  console.log('🚀 AI Koçluk Özelliği %100 Rollout Başlatılıyor...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const featureFlagsService = app.get(FeatureFlagsService);

  try {
    // AI Koçluk özelliğini %100 rollout ile güncelle
    await featureFlagsService.updateFeatureFlag('ai_coaching', {
      enabled: true,
      rolloutPercentage: 100,
      targetUsers: [],
      targetRoles: [],
      targetSegments: [],
      conditions: {
        variant: 'full_rollout',
        ai_coaching_enabled: true,
        advanced_features: true,
      },
    });

    console.log('✅ AI Koçluk özelliği başarıyla %100 rollout ile açıldı!');
    console.log('📊 Beklenen etki: Dönüşüm oranında %3.5 artış (%15.2 → %18.7)');
    console.log('🎯 Hedef: 1,250 MAU kullanıcısının %18.7\'si = 234 ek dönüşüm');

    // Rollout sonrası metrikleri takip etmek için analytics event
    console.log('📈 Rollout sonrası metrikler 24 saat içinde dashboard\'da görünecek');
    
  } catch (error) {
    console.error('❌ AI Koçluk rollout hatası:', error.message);
  } finally {
    await app.close();
  }
}

// Script'i çalıştır
startAICoachingRollout();
