import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return { message: 'Users service implementation' };
  }

  async findOne(id: string) {
    return { message: 'Find user implementation' };
  }

  async update(id: string, updateData: any) {
    return { message: 'Update user implementation' };
  }

  async remove(id: string) {
    return { message: 'Remove user implementation' };
  }

  async completeOnboarding(userId: string, onboardingData: any) {
    console.log('🎯 Completing onboarding for user:', userId);
    console.log('🎯 Onboarding data:', onboardingData);

    try {
      // Kullanıcıyı güncelle
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: onboardingData.fullName,
          // Diğer onboarding verilerini de ekleyebiliriz
        },
      });

      // StudentProfile oluştur veya güncelle
      const studentProfile = await this.prisma.studentProfile.upsert({
        where: { userId: userId },
        update: {
          grade: parseInt(onboardingData.grade) || 0,
          field: onboardingData.academicTrack || 'MF',
          goals: onboardingData.selectedSubjects || [],
          learningStyle: onboardingData.learningStyle || 'visual',
          strengths: [], // Boş bırak, sonra doldurulabilir
          weaknesses: onboardingData.weaknesses || [],
          interests: [], // Boş bırak, sonra doldurulabilir
        },
        create: {
          userId: userId,
          grade: parseInt(onboardingData.grade) || 0,
          field: onboardingData.academicTrack || 'MF',
          goals: onboardingData.selectedSubjects || [],
          learningStyle: onboardingData.learningStyle || 'visual',
          strengths: [],
          weaknesses: onboardingData.weaknesses || [],
          interests: [],
        },
      });

      console.log('✅ Onboarding completed successfully');
      
      return {
        success: true,
        message: 'Onboarding completed successfully',
        user: updatedUser,
        studentProfile: studentProfile,
      };
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      throw new Error('Failed to complete onboarding');
    }
  }
}
