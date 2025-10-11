import React from 'react';
import { CrudField } from './GenericCrudDialog';

export const teacherFields: CrudField[] = [
  {
    name: 'name',
    label: 'Ad Soyad',
    type: 'text',
    required: true,
    validation: (value) => {
      if (!value || value.trim().length < 2) {
        return 'Ad soyad en az 2 karakter olmalıdır';
      }
      return null;
    },
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    validation: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Geçerli bir email adresi giriniz';
      }
      return null;
    },
  },
  {
    name: 'phone',
    label: 'Telefon',
    type: 'text',
    validation: (value) => {
      if (value && !/^[0-9+\-\s()]+$/.test(value)) {
        return 'Geçerli bir telefon numarası giriniz';
      }
      return null;
    },
  },
  {
    name: 'subjects',
    label: 'Branşlar',
    type: 'multiselect',
    required: true,
    options: [
      { value: 'Matematik', label: 'Matematik' },
      { value: 'Fizik', label: 'Fizik' },
      { value: 'Kimya', label: 'Kimya' },
      { value: 'Biyoloji', label: 'Biyoloji' },
      { value: 'Türkçe', label: 'Türkçe' },
      { value: 'Tarih', label: 'Tarih' },
      { value: 'Coğrafya', label: 'Coğrafya' },
      { value: 'Felsefe', label: 'Felsefe' },
      { value: 'İngilizce', label: 'İngilizce' },
      { value: 'Almanca', label: 'Almanca' },
      { value: 'Fransızca', label: 'Fransızca' },
    ],
  },
  {
    name: 'experience',
    label: 'Deneyim (Yıl)',
    type: 'number',
    validation: (value) => {
      if (value && (value < 0 || value > 50)) {
        return 'Deneyim 0-50 yıl arasında olmalıdır';
      }
      return null;
    },
  },
  {
    name: 'education',
    label: 'Eğitim Durumu',
    type: 'select',
    options: [
      { value: 'Lisans', label: 'Lisans' },
      { value: 'Yüksek Lisans', label: 'Yüksek Lisans' },
      { value: 'Doktora', label: 'Doktora' },
    ],
  },
  {
    name: 'specializations',
    label: 'Uzmanlık Alanları',
    type: 'multiselect',
    options: [
      { value: 'YKS_Hazırlık', label: 'YKS Hazırlık' },
      { value: 'LGS_Hazırlık', label: 'LGS Hazırlık' },
      { value: 'KPSS_Hazırlık', label: 'KPSS Hazırlık' },
      { value: 'DGS_Hazırlık', label: 'DGS Hazırlık' },
      { value: 'Özel_Ders', label: 'Özel Ders' },
      { value: 'Grup_Dersi', label: 'Grup Dersi' },
      { value: 'Online_Eğitim', label: 'Online Eğitim' },
    ],
  },
  {
    name: 'availability',
    label: 'Müsaitlik Durumu',
    type: 'select',
    options: [
      { value: 'Tam_Zamanlı', label: 'Tam Zamanlı' },
      { value: 'Yarı_Zamanlı', label: 'Yarı Zamanlı' },
      { value: 'Hafta_Sonu', label: 'Hafta Sonu' },
      { value: 'Akşam', label: 'Akşam' },
    ],
  },
  {
    name: 'hourlyRate',
    label: 'Saatlik Ücret (TL)',
    type: 'number',
    validation: (value) => {
      if (value && (value < 0 || value > 10000)) {
        return 'Saatlik ücret 0-10000 TL arasında olmalıdır';
      }
      return null;
    },
  },
  {
    name: 'bio',
    label: 'Biyografi',
    type: 'text',
    multiline: true,
    rows: 3,
  },
  {
    name: 'isActive',
    label: 'Aktif',
    type: 'switch',
  },
];

export default teacherFields;
