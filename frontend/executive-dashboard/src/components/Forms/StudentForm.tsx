import React from 'react';
import { CrudField } from './GenericCrudDialog';

export const studentFields: CrudField[] = [
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
    name: 'grade',
    label: 'Sınıf',
    type: 'select',
    required: true,
    options: [
      { value: '9', label: '9. Sınıf' },
      { value: '10', label: '10. Sınıf' },
      { value: '11', label: '11. Sınıf' },
      { value: '12', label: '12. Sınıf' },
    ],
  },
  {
    name: 'field',
    label: 'Alan',
    type: 'select',
    required: true,
    options: [
      { value: 'Sayısal', label: 'Sayısal' },
      { value: 'Eşit Ağırlık', label: 'Eşit Ağırlık' },
      { value: 'Sözel', label: 'Sözel' },
      { value: 'Dil', label: 'Dil' },
    ],
  },
  {
    name: 'goals',
    label: 'Hedefler',
    type: 'multiselect',
    options: [
      { value: 'YKS_TYT', label: 'YKS TYT' },
      { value: 'YKS_AYT', label: 'YKS AYT' },
      { value: 'LGS', label: 'LGS' },
      { value: 'KPSS', label: 'KPSS' },
      { value: 'DGS', label: 'DGS' },
    ],
  },
  {
    name: 'learningStyle',
    label: 'Öğrenme Stili',
    type: 'select',
    options: [
      { value: 'Görsel', label: 'Görsel' },
      { value: 'İşitsel', label: 'İşitsel' },
      { value: 'Kinestetik', label: 'Kinestetik' },
      { value: 'Okuma/Yazma', label: 'Okuma/Yazma' },
    ],
  },
  {
    name: 'strengths',
    label: 'Güçlü Yönler',
    type: 'multiselect',
    options: [
      { value: 'Matematik', label: 'Matematik' },
      { value: 'Fizik', label: 'Fizik' },
      { value: 'Kimya', label: 'Kimya' },
      { value: 'Biyoloji', label: 'Biyoloji' },
      { value: 'Türkçe', label: 'Türkçe' },
      { value: 'Tarih', label: 'Tarih' },
      { value: 'Coğrafya', label: 'Coğrafya' },
      { value: 'Felsefe', label: 'Felsefe' },
    ],
  },
  {
    name: 'weaknesses',
    label: 'Zayıf Yönler',
    type: 'multiselect',
    options: [
      { value: 'Matematik', label: 'Matematik' },
      { value: 'Fizik', label: 'Fizik' },
      { value: 'Kimya', label: 'Kimya' },
      { value: 'Biyoloji', label: 'Biyoloji' },
      { value: 'Türkçe', label: 'Türkçe' },
      { value: 'Tarih', label: 'Tarih' },
      { value: 'Coğrafya', label: 'Coğrafya' },
      { value: 'Felsefe', label: 'Felsefe' },
    ],
  },
  {
    name: 'interests',
    label: 'İlgi Alanları',
    type: 'multiselect',
    options: [
      { value: 'Bilgisayar', label: 'Bilgisayar' },
      { value: 'Mühendislik', label: 'Mühendislik' },
      { value: 'Tıp', label: 'Tıp' },
      { value: 'Hukuk', label: 'Hukuk' },
      { value: 'İşletme', label: 'İşletme' },
      { value: 'Sanat', label: 'Sanat' },
      { value: 'Spor', label: 'Spor' },
      { value: 'Müzik', label: 'Müzik' },
    ],
  },
  {
    name: 'selectedSubjects',
    label: 'Seçilen Dersler',
    type: 'multiselect',
    options: [
      { value: 'Matematik', label: 'Matematik' },
      { value: 'Fizik', label: 'Fizik' },
      { value: 'Kimya', label: 'Kimya' },
      { value: 'Biyoloji', label: 'Biyoloji' },
      { value: 'Türkçe', label: 'Türkçe' },
      { value: 'Tarih', label: 'Tarih' },
      { value: 'Coğrafya', label: 'Coğrafya' },
      { value: 'Felsefe', label: 'Felsefe' },
    ],
  },
  {
    name: 'isActive',
    label: 'Aktif',
    type: 'switch',
  },
];

export default studentFields;
