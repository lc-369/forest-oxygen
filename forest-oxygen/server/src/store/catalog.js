// ===== 服务项目初始清单 =====
// 数据源：见《需求分析》§5 附录一《森林氧吧·AI智慧康养系统服务项目清单》。
// 初始数据应完整录入（管理员可后续编辑）；仅当项目库为空时一次性写入。
// 注意：本清单属“系统目录数据”，并非模拟用户信息，故随系统初始化落地。

export const PROJECT_CATALOG = [
  {
    id: 'P001', name: '森林浴·负氧离子漫步',
    location: '湖畔步道', fee: 88, capacity: 8, status: 'active',
    duration: '约90分钟',
    flow: '在护工陪同下沿湖畔森林步道慢走，途中进行深呼吸吐纳与观景小憩，护工讲解负氧离子与呼吸养生要点。',
    suitable: '各年龄段；尤其适合失眠、易疲劳者',
    taboo: '严重心肺功能不全、行动需轮椅辅助者请在预约时说明，需专人陪护'
  },
  {
    id: 'P002', name: '太极养生操',
    location: '晨练草坪', fee: 68, capacity: 10, status: 'active',
    duration: '约60分钟',
    flow: '护工示范二十四式简化太极拳，配合呼吸节奏逐式教学，辅以关节热身与整理放松。',
    suitable: '中老年人群、久坐办公人群',
    taboo: '急性腰扭伤、膝关节严重病变者慎做蹲起动作'
  },
  {
    id: 'P003', name: '中医艾灸理疗',
    location: '养生馆·二楼灸疗室', fee: 168, capacity: 4, status: 'active',
    duration: '约45分钟',
    flow: '由持证理疗护工按体质选取穴位，进行温和灸或悬灸，全程监测皮肤温度并给予调理建议。',
    suitable: '畏寒怕冷、宫寒胃寒、关节酸痛人群',
    taboo: '孕妇、皮肤破损/感染处、高热及实热证人群禁灸'
  },
  {
    id: 'P004', name: '中药足浴',
    location: '足浴SPA区', fee: 98, capacity: 6, status: 'active',
    duration: '约40分钟',
    flow: '以当归、艾草等中药包煎汤足浴，护工按足底反射区适度按摩，结束后提供温养茶饮。',
    suitable: '下肢冰凉、睡眠不佳人群',
    taboo: '糖尿病足、下肢严重静脉曲张、足部皮肤感染者不宜'
  },
  {
    id: 'P005', name: '药膳养生餐',
    location: '氧吧·食疗餐厅', fee: 128, capacity: 20, status: 'active',
    duration: '约60分钟（含营养讲解）',
    flow: '依据个人体质与忌口定制当日药膳套餐，营养师式护工在用餐时讲解当季食养知识。',
    suitable: '所有入住客户（含家属陪同）',
    taboo: '食材过敏者请在预约时如实登记忌口，餐厅将替换菜品'
  },
  {
    id: 'P006', name: '森林冥想·正念练习',
    location: '竹林冥想亭', fee: 58, capacity: 12, status: 'active',
    duration: '约45分钟',
    flow: '在竹林环绕的环境中，护工引导呼吸冥想与身体扫描，帮助放松情绪、改善睡眠。',
    suitable: '焦虑、情绪紧张、入睡困难人群',
    taboo: '精神障碍急性期患者建议在专人陪同监护下进行'
  },
  {
    id: 'P007', name: '八段锦晨练',
    location: '松林广场', fee: 48, capacity: 15, status: 'active',
    duration: '约50分钟',
    flow: '晨间集体练习八段锦，护工逐一纠正动作，兼顾柔韧与筋骨舒展。',
    suitable: '大多数中老年人及亚健康人群',
    taboo: '术后一个月内、骨折未愈者暂缓练习'
  },
  {
    id: 'P008', name: '园艺疗法·花艺种植',
    location: '四季花圃', fee: 88, capacity: 6, status: 'active',
    duration: '约70分钟',
    flow: '护工指导完成播种、扦插或插花，融入五感体验，成品可带回房间观赏。',
    suitable: '爱好自然、需要情绪疏导人群',
    taboo: '重度花粉过敏、对泥土过敏者不宜；春秋花粉季请佩戴口罩'
  }
]
