import React from 'react';
import { CrudField } from './GenericCrudDialog';

export const courseFields: CrudField[] = [
  {
    name: 'title',
    label: 'Kurs Adı',
    type: 'text',
    required: true,
    validation: (value) => {
      if (!value || value.trim().length < 3) {
        return 'Kurs adı en az 3 karakter olmalıdır';
      }
      return null;
    },
  },
  {
    name: 'description',
    label: 'Açıklama',
    type: 'text',
    multiline: true,
    rows: 3,
  },
  {
    name: 'subject',
    label: 'Ders',
    type: 'select',
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
    ],
  },
  {
    name: 'grade',
    label: 'Sınıf',
    type: 'select',
    required: true,
    options: [
      { value: '9', label: '9. Sınıf' },
      { value: '10', label: '10. Sınıf' },
      { value: '11', label: '11. Sınıf' },
      { value: '12', label: '12. Sınıf' },
      { value: 'Mezun', label: 'Mezun' },
    ],
  },
  {
    name: 'level',
    label: 'Seviye',
    type: 'select',
    required: true,
    options: [
      { value: 'Başlangıç', label: 'Başlangıç' },
      { value: 'Orta', label: 'Orta' },
      { value: 'İleri', label: 'İleri' },
      { value: 'Uzman', label: 'Uzman' },
    ],
  },
  {
    name: 'type',
    label: 'Kurs Türü',
    type: 'select',
    required: true,
    options: [
      { value: 'YKS_TYT', label: 'YKS TYT' },
      { value: 'YKS_AYT', label: 'YKS AYT' },
      { value: 'LGS', label: 'LGS' },
      { value: 'KPSS', label: 'KPSS' },
      { value: 'DGS', label: 'DGS' },
      { value: 'Özel_Ders', label: 'Özel Ders' },
      { value: 'Grup_Dersi', label: 'Grup Dersi' },
    ],
  },
  {
    name: 'duration',
    label: 'Süre (Dakika)',
    type: 'number',
    required: true,
    validation: (value) => {
      if (!value || value < 30 || value > 180) {
        return 'Süre 30-180 dakika arasında olmalıdır';
      }
      return null;
    },
  },
  {
    name: 'price',
    label: 'Fiyat (TL)',
    type: 'number',
    validation: (value) => {
      if (value && (value < 0 || value > 10000)) {
        return 'Fiyat 0-10000 TL arasında olmalıdır';
      }
      return null;
    },
  },
  {
    name: 'maxStudents',
    label: 'Maksimum Öğrenci Sayısı',
    type: 'number',
    validation: (value) => {
      if (value && (value < 1 || value > 50)) {
        return 'Öğrenci sayısı 1-50 arasında olmalıdır';
      }
      return null;
    },
  },
  {
    name: 'tags',
    label: 'Etiketler',
    type: 'multiselect',
    options: [
      { value: 'YKS', label: 'YKS' },
      { value: 'LGS', label: 'LGS' },
      { value: 'KPSS', label: 'KPSS' },
      { value: 'Matematik', label: 'Matematik' },
      { value: 'Fen', label: 'Fen' },
      { value: 'Sosyal', label: 'Sosyal' },
      { value: 'Dil', label: 'Dil' },
      { value: 'Online', label: 'Online' },
      { value: 'Yüz_Yüze', label: 'Yüz Yüze' },
    ],
  },
  {
    name: 'requirements',
    label: 'Ön Koşullar',
    type: 'multiselect',
    options: [
      { value: 'Temel_Matematik', label: 'Temel Matematik' },
      { value: 'Temel_Fizik', label: 'Temel Fizik' },
      { value: 'Temel_Kimya', label: 'Temel Kimya' },
      { value: 'Temel_Biyoloji', label: 'Temel Biyoloji' },
      { value: 'Temel_Türkçe', label: 'Temel Türkçe' },
      { value: 'Temel_Tarih', label: 'Temel Tarih' },
      { value: 'Temel_Coğrafya', label: 'Temel Coğrafya' },
    ],
  },
  {
    name: 'isActive',
    label: 'Aktif',
    type: 'switch',
  },
  {
    name: 'isOnline',
    label: 'Online',
    type: 'switch',
  },
];

export default courseFields;
