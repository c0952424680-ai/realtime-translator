import SwiftUI

struct TravelView: View {
    @ObservedObject var vm: TranslatorViewModel

    let categories = [
        ("🍜", "餐廳", ["請給我一份菜單", "我不要辣", "這個有含豬肉嗎？", "可以刷卡嗎？"]),
        ("🏨", "飯店", ["我有預訂房間", "可以幫我叫計程車嗎？", "Wi-Fi 密碼是多少？"]),
        ("✈️", "機場", ["登機門在哪裡？", "我要辦理登機", "我的行李在哪裡？"]),
        ("🚉", "交通", ["車站在哪裡？", "這班車到市中心嗎？", "我要去這個地址"]),
        ("🛍️", "購物", ["多少錢？", "有其他尺寸嗎？", "可以便宜一點嗎？"]),
        ("🆘", "緊急", ["請幫幫我", "請叫警察", "請叫救護車"])
    ]

    var body: some View {
        NavigationStack {
            List {
                Section("一點就能說") {
                    ForEach(categories, id: \.1) { category in
                        NavigationLink {
                            PhraseListView(title: category.1, phrases: category.2, vm: vm)
                        } label: {
                            Label {
                                Text(category.1)
                            } icon: {
                                Text(category.0)
                            }
                        }
                    }
                }
            }
            .navigationTitle("旅行模式")
        }
    }
}

struct PhraseListView: View {
    let title: String
    let phrases: [String]
    @ObservedObject var vm: TranslatorViewModel

    var body: some View {
        List(phrases, id: \.self) { phrase in
            Button {
                let result = OfflineTranslator.translate(
                    phrase,
                    from: vm.sourceLanguage,
                    to: vm.targetLanguage
                )
                vm.turns.append(
                    TranslationTurn(
                        speaker: .me,
                        source: phrase,
                        translation: result
                    )
                )
            } label: {
                Text(phrase)
                    .foregroundStyle(.primary)
            }
        }
        .navigationTitle(title)
    }
}
