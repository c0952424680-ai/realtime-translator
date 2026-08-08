import Foundation

enum AppLanguage: String, CaseIterable, Identifiable, Codable {
    case chinese = "zh-TW"
    case english = "en-US"
    case japanese = "ja-JP"
    case korean = "ko-KR"

    var id: String { rawValue }

    var name: String {
        switch self {
        case .chinese: "中文"
        case .english: "English"
        case .japanese: "日本語"
        case .korean: "한국어"
        }
    }

    var flag: String {
        switch self {
        case .chinese: "🇹🇼"
        case .english: "🇺🇸"
        case .japanese: "🇯🇵"
        case .korean: "🇰🇷"
        }
    }
}

enum ConversationSpeaker {
    case me, other
}

struct TranslationTurn: Identifiable {
    let id = UUID()
    let speaker: ConversationSpeaker
    let source: String
    let translation: String
}
