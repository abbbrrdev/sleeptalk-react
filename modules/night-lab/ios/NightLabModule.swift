import AVFoundation
import ExpoModulesCore
import SoundAnalysis

/// Two small jobs JS can't do well:
///  • trim(src, start, end, dest) — cut a clip out of the night recording (AAC, no re-encode cost worth noting)
///  • classify(file) — Apple's built-in sound classifier (300+ labels: speech, snoring, laughter, cough…), on device
public class NightLabModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NightLab")

    AsyncFunction("trim") { (src: String, start: Double, end: Double, dest: String, promise: Promise) in
      let srcURL = NightLabModule.url(src)
      let destURL = NightLabModule.url(dest)
      try? FileManager.default.removeItem(at: destURL)
      try? FileManager.default.createDirectory(at: destURL.deletingLastPathComponent(), withIntermediateDirectories: true)
      let asset = AVURLAsset(url: srcURL)
      guard let export = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetAppleM4A) else {
        promise.resolve(false)
        return
      }
      export.outputURL = destURL
      export.outputFileType = .m4a
      export.timeRange = CMTimeRange(
        start: CMTime(seconds: max(0, start), preferredTimescale: 600),
        end: CMTime(seconds: max(start + 0.5, end), preferredTimescale: 600)
      )
      export.exportAsynchronously {
        promise.resolve(export.status == .completed)
      }
    }

    AsyncFunction("classify") { (file: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let analyzer = try SNAudioFileAnalyzer(url: NightLabModule.url(file))
          let request = try SNClassifySoundRequest(classifierIdentifier: .version1)
          request.windowDuration = CMTime(seconds: 1.5, preferredTimescale: 48_000)
          request.overlapFactor = 0.5
          let observer = BestLabels()
          try analyzer.add(request, withObserver: observer)
          analyzer.analyze() // synchronous
          let top = observer.best
            .sorted { $0.value > $1.value }
            .prefix(6)
            .map { ["label": $0.key, "confidence": $0.value] as [String: Any] }
          promise.resolve(Array(top))
        } catch {
          promise.resolve([[String: Any]]())
        }
      }
    }
  }

  static func url(_ s: String) -> URL {
    if s.hasPrefix("file://"), let u = URL(string: s) { return u }
    return URL(fileURLWithPath: s)
  }
}

/// Keeps the highest confidence seen for each label across all windows of the clip.
final class BestLabels: NSObject, SNResultsObserving {
  var best: [String: Double] = [:]
  func request(_ request: SNRequest, didProduce result: SNResult) {
    guard let r = result as? SNClassificationResult else { return }
    for c in r.classifications.prefix(8) {
      best[c.identifier] = max(best[c.identifier] ?? 0, c.confidence)
    }
  }
  func request(_ request: SNRequest, didFailWithError error: Error) {}
  func requestDidComplete(_ request: SNRequest) {}
}
