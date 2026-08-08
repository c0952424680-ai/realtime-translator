import SwiftUI

struct HomeView: View {
    @StateObject private var vm = TranslatorViewModel()

    var body: some View {
        TabView {
            ConversationView(vm: vm)
                .tabItem { Label("即時翻譯", systemImage: "waveform.and.mic") }

            TravelView(vm: vm)
                .tabItem { Label("旅行", systemImage: "airplane") }

            OfflinePacksView()
                .tabItem { Label("離線", systemImage: "arrow.down.circle") }
        }
        .tint(.blue)
    }
}

struct ConversationView: View {
    @ObservedObject var vm: TranslatorViewModel

    var body: some View {
        NavigationStack {
            VStack(spacing: 14) {
                HStack {
                    LanguageButton(language: vm.sourceLanguage) {
                        vm.swapLanguages()
                    }
                    Image(systemName: "arrow.left.arrow.right")
                        .foregroundStyle(.secondary)
                    LanguageButton(language: vm.targetLanguage) {
                        vm.swapLanguages()
                    }
                }

                HStack {
                    Label(vm.modeText, systemImage: vm.isOfflineMode ? "wifi.slash" : "wifi")
                    Spacer()
                    Text(vm.statusText)
                }
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)

                ScrollView {
                    LazyVStack(spacing: 12) {
                        if vm.turns.isEmpty {
                            ContentUnavailableView(
                                "開始對話",
                                systemImage: "person.2.wave.2",
                                description: Text("按住麥克風說話，App 會翻譯並播放。")
                            )
                            .padding(.top, 60)
                        } else {
                            ForEach(vm.turns) { turn in
                                TurnBubble(turn: turn)
                            }
                        }
                    }
                    .padding(.vertical)
                }

                Button {
                    vm.toggleListening()
                } label: {
                    ZStack {
                        Circle()
                            .fill(vm.isListening ? Color.red : Color.blue)
                            .frame(width: 88, height: 88)
                        Image(systemName: vm.isListening ? "stop.fill" : "mic.fill")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .accessibilityLabel(vm.isListening ? "停止聆聽" : "開始聆聽")

                Text(vm.liveText.isEmpty ? "按一下開始說話" : vm.liveText)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)

                HStack {
                    Button("清除") { vm.clearConversation() }
                    Spacer()
                    Button {
                        vm.repeatLastTranslation()
                    } label: {
                        Label("重播", systemImage: "speaker.wave.2.fill")
                    }
                    .disabled(vm.turns.isEmpty)
                }
                .font(.subheadline.weight(.semibold))
            }
            .padding()
            .navigationTitle("即時譯")
        }
    }
}

struct LanguageButton: View {
    let language: AppLanguage
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(language.flag) \(language.name)")
                    .font(.headline)
                Text("點擊交換")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(10)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }
}

struct TurnBubble: View {
    let turn: TranslationTurn

    var body: some View {
        VStack(alignment: turn.speaker == .me ? .trailing : .leading, spacing: 7) {
            Text(turn.source)
                .font(.body)
            Text(turn.translation)
                .font(.headline)
                .foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity, alignment: turn.speaker == .me ? .trailing : .leading)
        .padding(14)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
    }
}
