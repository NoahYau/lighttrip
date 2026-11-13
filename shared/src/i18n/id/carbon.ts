import type { TranslationStrings } from '../types';

/** Panel jejak karbon dan tabel perbandingan moda transportasi */
const carbon: TranslationStrings = {
  'carbon.title': 'Jejak karbon',
  'carbon.subtitle': 'Perkiraan CO₂e untuk perjalanan ini',
  'carbon.total': 'Perkiraan total',
  'carbon.totalValue': '{value} kg CO₂e',
  'carbon.measuredLegs': 'Segmen terukur',
  'carbon.measuredValue': '{estimated} / {total}',
  'carbon.km': '{value} km',
  'carbon.disclaimer': 'Perkiraan: jarak garis lurus dan faktor emisi rata-rata, bukan audit karbon.',
  'carbon.byMode': 'Sumber emisi',
  'carbon.perDay': 'Per hari',
  'carbon.legs': 'Segmen perjalanan',
  'carbon.empty':
    'Belum ada yang bisa diukur — tambahkan perhentian dengan lokasi, atau pesan transportasi dengan kedua stasiun.',
  'carbon.loading': 'Mengukur…',
  'carbon.offline': 'Perkiraan karbon memerlukan koneksi.',
  'carbon.error': 'Tidak dapat memuat perkiraan karbon.',
  'carbon.retry': 'Coba lagi',
  'carbon.unknownMode': 'Belum diperkirakan',
  'carbon.compareTitle': 'Bandingkan moda transportasi',
  'carbon.compareFor': 'Untuk {route}',
  'carbon.comparePick': 'Pilih segmen untuk melihat alternatifnya.',
  'carbon.compareMode': 'Moda',
  'carbon.compareEmissions': 'CO₂e',
  'carbon.compareSaved': 'Penghematan',
  'carbon.compareBest': 'Terendah',
  'carbon.compareCurrent': 'Saat ini',
  'carbon.mode.walk': 'Jalan kaki',
  'carbon.mode.cycle': 'Bersepeda',
  'carbon.mode.rail': 'Kereta',
  'carbon.mode.bus': 'Bus', // same-as-en
  'carbon.mode.coach': 'Bus antarkota',
  'carbon.mode.car': 'Mobil (bensin atau diesel)',
  'carbon.mode.car_electric': 'Mobil listrik',
  'carbon.mode.taxi': 'Taksi',
  'carbon.mode.motorbike': 'Motor',
  'carbon.mode.ferry': 'Kapal feri',
  'carbon.mode.cruise': 'Kapal pesiar',
  'carbon.mode.flight': 'Penerbangan',
};

export default carbon;
