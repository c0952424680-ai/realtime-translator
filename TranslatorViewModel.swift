import Foundation
import AVFoundation
import Speech
import SwiftUI

@MainActor
final class TranslatorViewModel: ObservableObject {
    @Published var sourceLanguage: AppLanguage = .chinese
    @Published var targetLanguage: AppLanguage = .japanese
    @Published var turns: [TranslationTurn] = []
    @Published var liveText = ""
    @Published var statusText = "準備完成"
    @Published var isListening = false
    @Published var isOfflineMode = true

    private let speechSynthesizer = AVSpeechSynthesizer()
    private var audioEngine: AVAudioEngine?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?

    var modeText: String {
        isOfflineMode ? "離線優先" : "線上"
    }

    func swapLanguages() {
        let old = sourceLanguage
        sourceLanguage = targetLanguage
        targetLanguage = old
    }

    func toggleListening() {
        isListening ? stopListening() : startListening()
    }

    func clearConversation() {
        turns.removeAll()
        liveText = ""
        statusText = "準備完成"
    }

    func repeatLastTranslation() {
        guard let last = turns.last else { return }
        speak(last.translation)
    }

    func startListening() {
        liveText = ""
        statusText = "正在準備麥克風…"

        SFSpeechRecognizer.requestAuthorization { [weak self] _ in
            Task { @MainActor in
                self?.beginRecognition()
            }
        }
    }

    private func beginRecognition() {
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: sourceLanguage.rawValue)) else {
            statusText = "此語言的語音辨識不可用"
            return
        }

        guard recognizer.isAvailable else {
            statusText = "語音辨識目前不可用"
            return
        }

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .measurement, options: [.duckOthers])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            statusText = "麥克風啟用失敗"
            return
        }

        audioEngine = AVAudioEngine()
        guard let audioEngine else { return }

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let request = recognitionRequest else { return }
        request.shouldReportPartialResults = true

        // 若裝置/語言支援，要求完全在裝置端辨識。
        isOfflineMode = recognizer.supportsOnDeviceRecognition
        if isOfflineMode {
            request.requiresOnDeviceRecognition = true
            statusText = "離線語音辨識中…"
        } else {
            statusText = "此語言目前不支援裝置端辨識"
        }

        let input = audioEngine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) {
            [weak request] buffer, _ in
            request?.append(buffer)
        }

        recognitionTask?.cancel()
        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            Task { @MainActor in
                guard let self else { return }

                if let result {
                    self.liveText = result.bestTranscription.formattedString

                    if result.isFinal {
                        self.finishTurn()
                    }
                }

                if error != nil {
                    self.stopListening()
                }
            }
        }

        do {
            audioEngine.prepare()
            try audioEngine.start()
            isListening = true
            statusText = isOfflineMode ? "聽取中 · 離線" : "聽取中"
        } catch {
            statusText = "無法開始錄音"
        }
    }

    func stopListening() {
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()

        recognitionTask = nil
        recognitionRequest = nil
        audioEngine = nil
        isListening = false

        if !liveText.isEmpty {
            finishTurn()
        } else {
            statusText = "準備完成"
        }
    }

    private func finishTurn() {
        let source = liveText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !source.isEmpty else { return }

        let translated = OfflineTranslator.translate(
            source,
            from: sourceLanguage,
            to: targetLanguage
        )

        turns.append(
            TranslationTurn(
                speaker: .me,
                source: source,
                translation: translated
            )
        )

        liveText = ""
        statusText = "翻譯完成 · \(isOfflineMode ? "離線" : "線上")"
        speak(translated)
        stopListening()
    }

    private func speak(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: targetLanguage.rawValue)
        utterance.rate = 0.47
        speechSynthesizer.stopSpeaking(at: .immediate)
        speechSynthesizer.speak(utterance)
    }
}

// 第一版可直接離線運作的旅行句型核心。
// 後續只替換這個服務，不需要改 UI 或對話流程。
enum OfflineTranslator {
    static func translate(_ text: String, from: AppLanguage, to: AppLanguage) -> String {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)

        let key = "\(from.rawValue)->\(to.rawValue)"
        let tables: [String: [String: String]] = [
            "zh-TW->ja-JP": [
                "你好": "こんにちは。",
                "謝謝": "ありがとうございます。",
                "不好意思": "すみません。",
                "請問車站在哪裡": "駅はどこですか？",
                "請問這附近有便利商店嗎": "この近くにコンビニはありますか？",
                "多少錢": "いくらですか？",
                "我不要辣": "辛くしないでください。",
                "可以刷卡嗎": "カードは使えますか？",
                "洗手間在哪裡": "トイレはどこですか？",
                "我聽不懂": "よく分かりません。"
            ],
            "zh-TW->en-US": [
                "你好": "Hello.",
                "謝謝": "Thank you.",
                "不好意思": "Excuse me.",
                "請問車站在哪裡": "Where is the station?",
                "請問這附近有便利商店嗎": "Is there a convenience store nearby?",
                "多少錢": "How much is it?",
                "我不要辣": "I don't want it spicy.",
                "可以刷卡嗎": "Can I pay by card?",
                "洗手間在哪裡": "Where is the restroom?",
                "我聽不懂": "I don't understand."
            ],
            "zh-TW->ko-KR": [
                "你好": "안녕하세요.",
                "謝謝": "감사합니다.",
                "不好意思": "실례합니다.",
                "多少錢": "얼마예요?",
                "洗手間在哪裡": "화장실이 어디예요?"
            ]
        ]

        if let result = tables[key]?[t] {
            return result
        }

        if from == to {
            return t
        }

        return "離線翻譯詞庫尚未收錄這句話"
    }
}
