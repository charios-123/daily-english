package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"daily-english-reader-backend/config"
	"daily-english-reader-backend/database"
	"daily-english-reader-backend/models"

	"github.com/joho/godotenv"
	"gorm.io/datatypes"
)

// seedArticle 种子文章数据
type seedArticle struct {
	date       string
	titleEn    string
	titleZh    string
	summaryEn  string
	summaryZh  string
	difficulty string
	blocks     [][2]string // [英文, 中文] 段落对
}

var articles = []seedArticle{
	{
		date: "2024-01-04", titleEn: "Healthy Morning Habits", titleZh: "健康的早晨习惯",
		summaryEn: "Simple morning routines that can improve your health and energy levels throughout the day.", summaryZh: "简单的早晨习惯可以改善你的健康水平和一整天的精力。",
		difficulty: "beginner",
		blocks: [][2]string{
			{"A good morning starts with good habits.", "美好的一天从好习惯开始。"},
			{"Drinking a glass of water when you wake up helps your body start fresh.", "醒来后喝一杯水能帮助你的身体焕然一新。"},
			{"Eating a healthy breakfast gives you energy for the whole morning.", "吃一顿健康的早餐能为整个上午提供能量。"},
			{"A short walk in the morning makes you feel active and happy.", "早晨散步能让你感到充满活力且心情愉快。"},
			{"Try these habits for one week and see how you feel.", "试着坚持这些习惯一周，看看你的感受如何。"},
		},
	},
	{
		date: "2024-01-05", titleEn: "My School Life", titleZh: "我的校园生活",
		summaryEn: "A student describes a typical day at school, from classes to after-school activities.", summaryZh: "一名学生描述了从课堂到课后活动的典型校园一天。",
		difficulty: "beginner",
		blocks: [][2]string{
			{"I go to school at seven thirty every morning.", "我每天早上七点半去上学。"},
			{"We have four classes in the morning and three in the afternoon.", "我们上午有四节课，下午有三节课。"},
			{"My favorite subject is English because the teacher is very interesting.", "我最喜欢的科目是英语，因为老师非常有趣。"},
			{"After school, I play basketball with my friends.", "放学后，我和朋友们一起打篮球。"},
			{"I think school is fun and I learn many new things every day.", "我觉得学校很有趣，每天都能学到很多新东西。"},
		},
	},
	{
		date: "2024-01-06", titleEn: "The Four Seasons", titleZh: "四季",
		summaryEn: "An introduction to the four seasons and the changes they bring to nature and daily life.", summaryZh: "介绍四季以及它们给自然和日常生活带来的变化。",
		difficulty: "beginner",
		blocks: [][2]string{
			{"There are four seasons in a year: spring, summer, autumn and winter.", "一年有四个季节：春、夏、秋、冬。"},
			{"In spring, flowers bloom and the weather becomes warm.", "春天，花朵盛开，天气变暖。"},
			{"Summer is hot, and many people go swimming to stay cool.", "夏天很热，许多人去游泳来保持凉爽。"},
			{"Autumn brings cool air and colorful leaves on the trees.", "秋天带来凉爽的空气和树上彩色的叶子。"},
			{"In winter, snow covers the ground in many places.", "冬天，雪覆盖了许多地方的地面。"},
			{"Every season is beautiful in its own way.", "每个季节都有它独特的美。"},
		},
	},
	{
		date: "2024-01-07", titleEn: "My Favorite Food", titleZh: "我最喜欢的食物",
		summaryEn: "Why dumplings are the writer's favorite food and how they are made in the family.", summaryZh: "为什么饺子是作者最喜欢的食物，以及家人是如何制作的。",
		difficulty: "beginner",
		blocks: [][2]string{
			{"My favorite food is dumplings.", "我最喜欢的食物是饺子。"},
			{"My family makes dumplings together during the Spring Festival.", "春节期间，我们一家人会一起包饺子。"},
			{"First, we prepare the meat and vegetables for the filling.", "首先，我们准备馅料的肉和蔬菜。"},
			{"Then we wrap the filling in thin pieces of dough.", "然后我们把馅料包进薄薄的面皮里。"},
			{"Finally, we boil them and enjoy them with vinegar.", "最后，我们把饺子煮熟，蘸着醋享用。"},
			{"Dumplings always make me feel warm and happy.", "饺子总能让我感到温暖和幸福。"},
		},
	},
	{
		date: "2024-01-08", titleEn: "A Trip to the Zoo", titleZh: "动物园之旅",
		summaryEn: "A weekend visit to the zoo and the animals the writer saw there.", summaryZh: "周末去动物园游玩，以及作者在那里看到的动物。",
		difficulty: "beginner",
		blocks: [][2]string{
			{"Last weekend, my family visited the city zoo.", "上个周末，我们一家人去了城市动物园。"},
			{"We saw many animals, including lions, elephants and pandas.", "我们看到了许多动物，包括狮子、大象和熊猫。"},
			{"The pandas were eating bamboo slowly and looked very cute.", "熊猫在慢慢吃竹子，看起来非常可爱。"},
			{"The zookeeper told us interesting stories about the animals.", "饲养员给我们讲了关于动物的有趣故事。"},
			{"It was a wonderful day and I learned a lot about wildlife.", "那是美好的一天，我学到了很多关于野生动物的知识。"},
		},
	},
	{
		date: "2024-01-09", titleEn: "Protecting Our Environment", titleZh: "保护我们的环境",
		summaryEn: "Practical ways ordinary people can help protect the environment in daily life.", summaryZh: "普通人在日常生活中帮助保护环境的实用方法。",
		difficulty: "intermediate",
		blocks: [][2]string{
			{"Environmental protection has become one of the most urgent issues of our time.", "环境保护已经成为我们这个时代最紧迫的问题之一。"},
			{"Small changes in our daily habits can make a significant difference.", "我们日常习惯中的小改变就能带来显著的差异。"},
			{"Reducing plastic use is a simple yet effective first step.", "减少塑料使用是简单而有效的第一步。"},
			{"Recycling paper, glass and metal helps save valuable natural resources.", "回收纸张、玻璃和金属有助于节约宝贵的自然资源。"},
			{"Walking or cycling instead of driving reduces air pollution and keeps us healthy.", "用步行或骑车代替开车既能减少空气污染，又能保持健康。"},
			{"If everyone takes responsibility, our planet will stay beautiful for future generations.", "如果每个人都承担责任，我们的地球将为后代保持美丽。"},
		},
	},
	{
		date: "2024-01-10", titleEn: "Traveling the World", titleZh: "环游世界",
		summaryEn: "How travel broadens the mind and what to consider when planning a journey.", summaryZh: "旅行如何开阔眼界，以及规划旅程时需要考虑什么。",
		difficulty: "intermediate",
		blocks: [][2]string{
			{"Traveling the world is a dream for many people.", "环游世界是许多人的梦想。"},
			{"Visiting new places exposes us to different cultures and ways of thinking.", "探访新地方让我们接触到不同的文化和思维方式。"},
			{"Planning is essential: book accommodation early and research local customs.", "规划至关重要：提前预订住宿，并了解当地的风俗习惯。"},
			{"Learning a few basic phrases in the local language helps you connect with people.", "学习几句当地语言的基本短语有助于你与人们交流。"},
			{"Travel teaches us that despite our differences, people everywhere share similar hopes.", "旅行教会我们，尽管存在差异，各地的人们都拥有相似的希望。"},
		},
	},
	{
		date: "2024-01-11", titleEn: "The Power of Music", titleZh: "音乐的力量",
		summaryEn: "How music affects our emotions, memory and daily productivity.", summaryZh: "音乐如何影响我们的情绪、记忆和日常效率。",
		difficulty: "intermediate",
		blocks: [][2]string{
			{"Music is a universal language that speaks to people of all ages.", "音乐是一种通用的语言，能与所有年龄段的人交流。"},
			{"Research shows that listening to music can reduce stress and improve mood.", "研究表明，听音乐可以减轻压力并改善情绪。"},
			{"Some studies even suggest that background music enhances concentration while studying.", "一些研究甚至表明，学习时播放背景音乐可以提高专注力。"},
			{"Music is also closely linked to memory, which is why a song can bring back old memories.", "音乐也与记忆密切相关，这就是为什么一首歌能唤起旧时记忆。"},
			{"Whether you play an instrument or simply enjoy listening, music enriches our lives.", "无论你演奏乐器还是单纯享受聆听，音乐都丰富了我们的生活。"},
		},
	},
	{
		date: "2024-01-12", titleEn: "Smartphones and Our Lives", titleZh: "智能手机与我们的生活",
		summaryEn: "The benefits and challenges of smartphone use in modern society.", summaryZh: "智能手机在现代社会使用中的好处与挑战。",
		difficulty: "intermediate",
		blocks: [][2]string{
			{"Smartphones have completely changed the way we live and communicate.", "智能手机彻底改变了我们生活和交流的方式。"},
			{"They allow us to stay connected with friends and access information instantly.", "它们让我们能与朋友保持联系，并即时获取信息。"},
			{"However, too much screen time can affect our sleep and face-to-face communication.", "然而，过多的屏幕时间会影响我们的睡眠和面对面交流。"},
			{"Experts recommend taking regular breaks from the phone, especially before bedtime.", "专家建议定期放下手机休息，尤其是在睡前。"},
			{"The key is to use technology wisely so that it serves us, not controls us.", "关键在于明智地使用科技，让它为我们服务，而不是控制我们。"},
		},
	},
	{
		date: "2024-01-13", titleEn: "Choosing a Career", titleZh: "职业规划",
		summaryEn: "Factors to consider when choosing a career and the importance of passion.", summaryZh: "选择职业时需要考虑的因素以及热情的重要性。",
		difficulty: "intermediate",
		blocks: [][2]string{
			{"Choosing a career is one of the most important decisions in life.", "选择职业是人生中最重要的决定之一。"},
			{"Many people believe that following your passion leads to long-term satisfaction.", "许多人认为，追随自己的热情能带来长期的满足感。"},
			{"Practical factors such as salary, job stability and work-life balance also matter.", "薪资、工作稳定性和工作与生活的平衡等实际因素也很重要。"},
			{"Internships and part-time jobs give students a taste of different industries.", "实习和兼职工作让学生们体验到不同行业的工作。"},
			{"A good career fits both your strengths and your values.", "好的职业既要符合你的优势，也要符合你的价值观。"},
		},
	},
	{
		date: "2024-01-14", titleEn: "Global Economy and Trade", titleZh: "全球经济与贸易",
		summaryEn: "How international trade connects countries and shapes the global economy.", summaryZh: "国际贸易如何连接各国并塑造全球经济。",
		difficulty: "advanced",
		blocks: [][2]string{
			{"The global economy is a complex network that connects producers and consumers worldwide.", "全球经济是一个连接世界各地生产者和消费者的复杂网络。"},
			{"International trade allows countries to specialize in what they produce most efficiently.", "国际贸易使各国能够专注于自己最擅长高效生产的产品。"},
			{"Supply chains have become so interconnected that a disruption in one region affects markets everywhere.", "供应链已经紧密相连，一个地区的扰动会影响各地的市场。"},
			{"Tariffs and trade agreements significantly influence the flow of goods between nations.", "关税和贸易协定极大地影响着国家之间的商品流动。"},
			{"While globalization brings economic growth, it also raises questions about fairness and sustainability.", "虽然全球化带来了经济增长，但它也引发了关于公平和可持续性的问题。"},
		},
	},
	{
		date: "2024-01-15", titleEn: "The Psychology of Happiness", titleZh: "幸福心理学",
		summaryEn: "Scientific insights into what actually makes people happy.", summaryZh: "关于究竟是什么让人们幸福的科学见解。",
		difficulty: "advanced",
		blocks: [][2]string{
			{"Psychologists have long studied what truly contributes to human happiness.", "心理学家长期研究究竟是什么真正促进了人类的幸福。"},
			{"Surprisingly, once basic needs are met, more money adds relatively little to happiness.", "令人惊讶的是，一旦基本需求得到满足，更多的钱对幸福的增加相对有限。"},
			{"Strong social relationships consistently rank as the most important factor in happiness.", "稳固的社会关系始终被评为幸福的最重要因素。"},
			{"Gratitude practices and helping others have been shown to boost well-being.", "研究表明，感恩练习和帮助他人能够提升幸福感。"},
			{"Happiness is less about circumstances and more about how we interpret and respond to them.", "幸福更多不在于环境本身，而在于我们如何解读和回应环境。"},
		},
	},
	{
		date: "2024-01-16", titleEn: "Ethics of Artificial Intelligence", titleZh: "人工智能的伦理",
		summaryEn: "The moral challenges posed by AI, from bias to privacy and accountability.", summaryZh: "人工智能带来的道德挑战，从偏见、隐私到责任归属。",
		difficulty: "advanced",
		blocks: [][2]string{
			{"As artificial intelligence becomes more powerful, ethical questions become increasingly urgent.", "随着人工智能变得更加强大，伦理问题变得日益紧迫。"},
			{"Algorithmic bias can reinforce existing inequalities if training data is not carefully examined.", "如果不对训练数据进行仔细审查，算法偏见可能会加剧现有的不平等。"},
			{"Privacy is another major concern, as AI systems often process vast amounts of personal data.", "隐私是另一个主要问题，因为人工智能系统常常处理大量个人数据。"},
			{"When an autonomous system makes a harmful decision, it is often unclear who should be held accountable.", "当自主系统做出有害的决定时，往往不清楚谁应该承担责任。"},
			{"Developing AI responsibly requires ongoing dialogue between technologists, policymakers and the public.", "负责任地开发人工智能需要技术专家、政策制定者和公众之间持续对话。"},
		},
	},
	{
		date: "2024-01-17", titleEn: "Space Exploration", titleZh: "太空探索",
		summaryEn: "Why humanity continues to explore space and what we have gained from it.", summaryZh: "人类为什么继续探索太空，以及我们从中获得了什么。",
		difficulty: "advanced",
		blocks: [][2]string{
			{"Humanity's desire to explore space reflects our deepest curiosity about the universe.", "人类探索太空的渴望反映了我们对宇宙最深层的好奇心。"},
			{"The Apollo missions not only put humans on the Moon but also inspired generations of scientists.", "阿波罗任务不仅让人类登上月球，还激励了一代又一代科学家。"},
			{"Satellites have transformed communication, weather forecasting and global navigation.", "卫星彻底改变了通信、天气预报和全球导航。"},
			{"International space stations serve as laboratories for research that is impossible on Earth.", "国际空间站是地球无法进行的研究的实验场所。"},
			{"As private companies join the race, the cost of space travel is gradually decreasing.", "随着私营公司加入竞争，太空旅行的成本正在逐渐下降。"},
		},
	},
	{
		date: "2024-01-18", titleEn: "The Climate Change Challenge", titleZh: "气候变化的挑战",
		summaryEn: "Understanding climate change, its impacts, and the global response it demands.", summaryZh: "理解气候变化、其影响以及它要求的全球应对措施。",
		difficulty: "advanced",
		blocks: [][2]string{
			{"Climate change is arguably the defining challenge of the twenty-first century.", "气候变化可以说是二十一世纪决定性的挑战。"},
			{"Rising global temperatures are linked to more frequent extreme weather events.", "全球气温上升与更频繁的极端天气事件有关。"},
			{"Scientists agree that human activities, especially the burning of fossil fuels, are the main cause.", "科学家们一致认为，人类活动，尤其是化石燃料的燃烧，是主要原因。"},
			{"The transition to renewable energy is accelerating but remains uneven across the world.", "向可再生能源的转型正在加速，但在世界各地的进展并不均衡。"},
			{"Addressing climate change requires cooperation on a scale never seen before in history.", "应对气候变化需要历史上前所未有规模的合作。"},
		},
	},
}

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	if err := database.Init(cfg); err != nil {
		log.Fatalf("数据库不可用，无法执行种子: %v", err)
	}

	inserted := 0
	skipped := 0
	for _, a := range articles {
		date, err := time.Parse("2006-01-02", a.date)
		if err != nil {
			log.Fatalf("日期解析失败 %s: %v", a.date, err)
		}

		// 检查日期是否已存在（唯一索引）
		var count int64
		database.DB.Model(&models.Article{}).Where("date = ?", datatypes.Date(date)).Count(&count)
		if count > 0 {
			log.Printf("跳过（日期已存在）: %s", a.titleEn)
			skipped++
			continue
		}

		// 构建 content JSON: [{"en": ..., "zh": ...}]
		blocks := make([]map[string]string, 0, len(a.blocks))
		for _, b := range a.blocks {
			blocks = append(blocks, map[string]string{"en": b[0], "zh": b[1]})
		}
		content, _ := json.Marshal(blocks)

		article := models.Article{
			Date:       datatypes.Date(date),
			TitleEn:    a.titleEn,
			TitleZh:    a.titleZh,
			SummaryEn:  a.summaryEn,
			SummaryZh:  a.summaryZh,
			Content:    datatypes.JSON(content),
			Difficulty: a.difficulty,
		}
		if err := database.DB.Create(&article).Error; err != nil {
			log.Printf("插入失败 %s: %v", a.titleEn, err)
			continue
		}
		inserted++
		log.Printf("已插入: %s (%s)", a.titleEn, a.difficulty)
	}

	var total int64
	database.DB.Model(&models.Article{}).Count(&total)
	fmt.Printf("\n完成: 新增 %d 篇, 跳过 %d 篇, 当前文章总数 %d\n", inserted, skipped, total)
}
