import type { TranslationStrings } from '../types';

/** Bảng dấu chân carbon và bảng so sánh phương thức di chuyển */
const carbon: TranslationStrings = {
  'carbon.title': 'Dấu chân carbon',
  'carbon.subtitle': 'Lượng CO₂e ước tính cho chuyến đi này',
  'carbon.total': 'Tổng ước tính',
  'carbon.totalValue': '{value} kg CO₂e',
  'carbon.measuredLegs': 'Chặng đã đo',
  'carbon.measuredValue': '{estimated} / {total}',
  'carbon.km': '{value} km',
  'carbon.disclaimer':
    'Ước tính: dựa trên khoảng cách đường chim bay và hệ số phát thải trung bình, không phải kiểm toán carbon.',
  'carbon.byMode': 'Nguồn phát thải',
  'carbon.perDay': 'Theo ngày',
  'carbon.legs': 'Các chặng di chuyển',
  'carbon.empty': 'Chưa có gì để đo — hãy thêm điểm dừng có vị trí, hoặc đặt chuyến vận chuyển có đủ hai ga.',
  'carbon.loading': 'Đang đo…',
  'carbon.offline': 'Ước tính carbon cần kết nối mạng.',
  'carbon.error': 'Không tải được ước tính carbon.',
  'carbon.retry': 'Thử lại',
  'carbon.unknownMode': 'Chưa ước tính',
  'carbon.compareTitle': 'So sánh phương thức di chuyển',
  'carbon.compareFor': 'Cho {route}',
  'carbon.comparePick': 'Chọn một chặng để xem các lựa chọn thay thế.',
  'carbon.compareMode': 'Phương thức',
  'carbon.compareEmissions': 'CO₂e',
  'carbon.compareSaved': 'Tiết kiệm',
  'carbon.compareBest': 'Thấp nhất',
  'carbon.compareCurrent': 'Hiện tại',
  'carbon.mode.walk': 'Đi bộ',
  'carbon.mode.cycle': 'Đi xe đạp',
  'carbon.mode.rail': 'Tàu hỏa',
  'carbon.mode.bus': 'Xe buýt',
  'carbon.mode.coach': 'Xe khách',
  'carbon.mode.car': 'Ô tô (xăng hoặc dầu diesel)',
  'carbon.mode.car_electric': 'Ô tô điện',
  'carbon.mode.taxi': 'Taxi', // same-as-en
  'carbon.mode.motorbike': 'Xe máy',
  'carbon.mode.ferry': 'Phà',
  'carbon.mode.cruise': 'Du thuyền',
  'carbon.mode.flight': 'Máy bay',
};

export default carbon;
