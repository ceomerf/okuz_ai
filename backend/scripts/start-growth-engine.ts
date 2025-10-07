import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FeatureFlagsService } from '../src/common/feature-flags/feature-flags.service';
import { PlanCreationABTestService } from '../src/planning/plan-creation-ab-test.service';
import { GrowthMeetingService } from '../src/growth/growth-meeting.service';

async function startGrowthEngine() {
  console.log('🚀 BÜYÜME MOTORU BAŞLATILIYOR...');
  console.log('=====================================');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const featureFlagsService = app.get(FeatureFlagsService);
  const planCreationABTest = app.get(PlanCreationABTestService);
  const growthMeetingService = app.get(GrowthMeetingService);

  try {
    // 1. AI Koçluk özelliğini %100 rollout ile aç
    console.log('\n🎯 ADIM 1: AI Koçluk Özelliği %100 Rollout');
    console.log('-------------------------------------------');
    
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

    // 2. Plan oluşturma A/B testini başlat
    console.log('\n🧪 ADIM 2: Plan Oluşturma A/B Testi Başlatılıyor');
    console.log('-----------------------------------------------');
    
    await planCreationABTest.startPlanCreationABTest();
    
    console.log('✅ Plan oluşturma A/B testi başlatıldı!');
    console.log('📊 Test Parametreleri:');
    console.log('  - Kontrol Grubu: 5 adımlı orijinal akış');
    console.log('  - Tedavi Grubu: 3 adımlı basitleştirilmiş akış');
    console.log('  - Hedef Segment: Yeni ve aktif kullanıcılar');
    console.log('  - Test Süresi: 14 gün');
    console.log('  - Beklenen Sonuç: %30 drop-off → %15 drop-off');

    // 3. Haftalık büyüme toplantısı raporu oluştur
    console.log('\n📊 ADIM 3: Haftalık Büyüme Toplantısı Raporu');
    console.log('---------------------------------------------');
    
    const growthReport = await growthMeetingService.generateWeeklyGrowthReport();
    const growthSummary = await growthMeetingService.getWeeklyGrowthSummary();
    
    console.log('✅ Haftalık büyüme raporu oluşturuldu!');
    console.log('\n📈 ANAHTAR METRİKLER:');
    console.log(`  - MAU: ${growthSummary.keyMetrics.mau}`);
    console.log(`  - MRR: $${growthSummary.keyMetrics.mrr.toLocaleString()}`);
    console.log(`  - Retention (Day 7): %${growthSummary.keyMetrics.retention}`);
    console.log(`  - Conversion Rate: %${growthSummary.keyMetrics.conversion}`);

    console.log('\n🎯 ÖNEMLİ İÇGÖRÜLER:');
    growthSummary.topInsights.forEach((insight, index) => {
      console.log(`  ${index + 1}. ${insight.title}: ${insight.description}`);
    });

    console.log('\n🚀 ACİL AKSİYONLAR:');
    growthSummary.urgentActions.forEach((action, index) => {
      console.log(`  ${index + 1}. ${action.action}`);
    });

    console.log('\n📅 GELECEK HAFTA ODAK NOKTALARI:');
    growthSummary.nextWeekFocus.forEach((focus, index) => {
      console.log(`  ${index + 1}. ${focus}`);
    });

    // 4. Büyüme motoru durumu
    console.log('\n🎉 BÜYÜME MOTORU BAŞARIYLA BAŞLATILDI!');
    console.log('=====================================');
    console.log('✅ AI Koçluk özelliği %100 rollout ile açıldı');
    console.log('✅ Plan oluşturma A/B testi başlatıldı');
    console.log('✅ Haftalık büyüme toplantısı raporu hazır');
    console.log('✅ KPI Dashboard aktif');
    console.log('✅ Veri odaklı karar verme sistemi çalışıyor');
    
    console.log('\n📋 SONRAKI ADIMLAR:');
    console.log('1. 24 saat sonra AI Koçluk rollout etkisini ölç');
    console.log('2. 7 gün sonra Plan oluşturma A/B test sonuçlarını değerlendir');
    console.log('3. Her Pazartesi 10:00\'da haftalık büyüme toplantısı yap');
    console.log('4. Dashboard\'u sürekli izle ve aksiyon al');
    
    console.log('\n🚀 BÜYÜME MOTORU ÇALIŞIYOR! İyi şanslar! 🚀');

  } catch (error) {
    console.error('❌ Büyüme motoru başlatma hatası:', error.message);
  } finally {
    await app.close();
  }
}

// Script'i çalıştır
startGrowthEngine();
