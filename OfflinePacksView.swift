import SwiftUI

struct OfflinePacksView: View {
    @AppStorage("installedLanguages") private var installedLanguages = "zh-TW,en-US,ja-JP"

    private let languages = AppLanguage.allCases

    var installed: Set<String> {
        Set(installedLanguages.split(separator: ",").map(String.init))
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Label("離線優先", systemImage: "wifi.slash")
                        .font(.headline)
                    Text("App 會優先使用裝置端語音辨識與本地翻譯能力。不同 iPhone 與語言的離線支援程度可能不同。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("語言") {
                    ForEach(languages) { language in
                        HStack {
                            Text("\(language.flag) \(language.name)")
                            Spacer()

                            if installed.contains(language.rawValue) {
                                Label("已準備", systemImage: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                            } else {
                                Button("加入") {
                                    var set = installed
                                    set.insert(language.rawValue)
                                    installedLanguages = set.sorted().joined(separator: ",")
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }

                Section("V2") {
                    Text("完整離線翻譯模型、可下載語言資產與網路高品質翻譯將在下一階段接入，不改變目前 UI。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("離線")
        }
    }
}
