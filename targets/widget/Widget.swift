import SwiftUI
import WidgetKit

// Data written by the app (src/lib/widgetSync.ts → src/lib/widget.ts → App Group "widget" dictionary).
// Labels arrive already translated into the app's language.
// "abr.sleeptalk.widget" → "group.abr.sleeptalk" (follows the app's bundle id)
private let GROUP: String = {
  let id = Bundle.main.bundleIdentifier ?? "abr.sleeptalk.widget"
  return "group." + id.split(separator: ".").dropLast().joined(separator: ".")
}()

/// @kingstinct/expo-apple-targets' ExtensionStorage.set(key, object) stores the object as JSON *Data*
/// (not a plist dictionary), so `dictionary(forKey:)` alone always returns nil. Accept both.
private func widgetDict() -> [String: Any]? {
  guard let ud = UserDefaults(suiteName: GROUP) else { return nil }
  if let d = ud.dictionary(forKey: "widget") { return d }
  if let data = ud.data(forKey: "widget") { return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] }
  return nil
}
/// JS numbers arrive as NSNumber; accept 3, 3.0 and 2.7 (rounded) alike.
private func intVal(_ v: Any?) -> Int? {
  guard let n = v as? NSNumber, n.doubleValue.isFinite else { return nil }
  return Int(n.doubleValue.rounded())
}

private func num(_ v: Any?) -> Int { (v as? NSNumber)?.intValue ?? (v as? Int) ?? 0 }

struct Snap {
  var id = "", n = 0, ended = 0, talk = 0, snore = 0, laugh = 0, clips = 0
  /// The user's own sleep talk (first transcribed talk clip). Shown only here.
  var quote = ""
  var issue = "", said = "Things you said", title = "Night report"
  var talkL = "talk", snoreL = "snore", laughL = "laugh"
  var tonight = "Tonight", start = "Start night", next = "", hint = "Plug in · face down · within 1 m of your pillow"

  static func load() -> Snap {
    var s = Snap()
    guard let d = widgetDict() else { return s }
    s.id = d["id"] as? String ?? ""
    s.n = num(d["n"])
    s.ended = num(d["ended"])
    s.talk = num(d["talk"])
    s.snore = num(d["snore"])
    s.laugh = num(d["laugh"])
    s.clips = num(d["clips"])
    s.quote = d["quote"] as? String ?? ""
    s.issue = d["l_issue"] as? String ?? (s.n > 0 ? "Issue #\(s.n)" : "")
    s.said = d["l_said"] as? String ?? s.said
    s.title = d["l_title"] as? String ?? s.title
    s.talkL = d["l_talk"] as? String ?? s.talkL
    s.snoreL = d["l_snore"] as? String ?? s.snoreL
    s.laughL = d["l_laugh"] as? String ?? s.laughL
    s.tonight = d["l_tonight"] as? String ?? s.tonight
    s.start = d["l_start"] as? String ?? s.start
    s.next = d["l_next"] as? String ?? ""
    s.hint = d["l_hint"] as? String ?? s.hint
    return s
  }

  static var sample: Snap {
    var s = Snap()
    s.id = "sample"; s.n = 4; s.ended = Int(Date().timeIntervalSince1970); s.talk = 3; s.snore = 2; s.laugh = 1; s.clips = 6
    s.quote = "No, the penguins go on the left"
    s.issue = "Issue #4"; s.next = "Issue #5 starts tonight"
    return s
  }

  /// The last 20:00 at or before `date` (local calendar): the evening a new issue begins.
  static func eveningStart(_ date: Date) -> Date {
    let cal = Calendar.current
    let today8 = cal.date(bySettingHour: 20, minute: 0, second: 0, of: date) ?? date
    return date >= today8 ? today8 : (cal.date(byAdding: .day, value: -1, to: today8) ?? today8)
  }
  /// Show the last night's issue (until 20:00 the next evening); otherwise "Start night".
  func showsReport(_ date: Date) -> Bool {
    n > 0 && ended > 0 && Date(timeIntervalSince1970: TimeInterval(ended)) >= Snap.eveningStart(date)
  }
  var headline: String { quote.isEmpty ? said : "“\(quote)”" }
  var counts: String { "\(talk) \(talkL) · \(snore) \(snoreL) · \(laugh) \(laughL)" }
  func url(_ date: Date) -> URL? {
    guard showsReport(date) else { return URL(string: "sleeptalk://night") }
    let q = id.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? ""
    return URL(string: "sleeptalk://report?id=\(q)")
  }
}

struct Entry: TimelineEntry { let date: Date; let snap: Snap }

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry { Entry(date: Date(), snap: .sample) }
  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
    let s = Snap.load()
    completion(s.n > 0 ? Entry(date: Date(), snap: s) : placeholder(in: context))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    let s = Snap.load()
    let now = Date()
    let cal = Calendar.current
    let today8 = cal.date(bySettingHour: 20, minute: 0, second: 0, of: now) ?? now.addingTimeInterval(3600)
    let next8 = today8 > now ? today8 : (cal.date(byAdding: .day, value: 1, to: today8) ?? now.addingTimeInterval(86400))
    // the report now (if any), and the "Start night" state from 20:00; the app reloads us after a new night
    completion(Timeline(entries: [Entry(date: now, snap: s), Entry(date: next8, snap: s)], policy: .after(next8)))
  }
}

// ── Risograph palette (src/lib/theme.ts) ─────────────────────────────
func rgb(_ h: UInt32) -> Color {
  Color(red: Double((h >> 16) & 0xFF) / 255, green: Double((h >> 8) & 0xFF) / 255, blue: Double(h & 0xFF) / 255)
}
let paper = rgb(0xF3EEE4)
let ink = rgb(0x1B1A1F)
let ink2 = rgb(0x46434B)
let pink = rgb(0xFF4F9A)
let pinkSoft = rgb(0xFFD7E8)
let blue = rgb(0x2F4FCE)
let blueSoft = rgb(0xD9DFF6)
let yellow = rgb(0xFFD43D)
let yellowSoft = rgb(0xFFF0B8)
let night = rgb(0x15142C)
let nightInk = rgb(0xEEE9FF)
let nightMuted = rgb(0x8D89B8)

/// Halftone dots that fade out away from the top-right corner.
struct Halftone: Shape {
  var step: CGFloat = 8
  func path(in r: CGRect) -> Path {
    var p = Path()
    let reach = max(r.width, r.height) * 0.85
    var y = r.minY
    var row = 0
    while y <= r.maxY {
      var x = r.minX + (row % 2 == 1 ? step / 2 : 0)
      while x <= r.maxX {
        let dx = r.maxX - x, dy = y - r.minY
        let k = 1 - min(1, (dx * dx + dy * dy).squareRoot() / reach)
        let rad = step * 0.42 * k
        if rad > 0.5 { p.addEllipse(in: CGRect(x: x - rad, y: y - rad, width: rad * 2, height: rad * 2)) }
        x += step
      }
      y += step
      row += 1
    }
    return p
  }
}

/// Title printed twice: pink plate slightly off register under the ink plate.
struct Riso: View {
  let text: String; let size: CGFloat; var color: Color = ink; var lines: Int = 2
  var body: some View {
    ZStack(alignment: .topLeading) {
      Text(text).font(.system(size: size, weight: .black)).foregroundColor(pink).offset(x: 1.6, y: 1.6)
      Text(text).font(.system(size: size, weight: .black)).foregroundColor(color)
    }.lineLimit(lines).minimumScaleFactor(0.6)
  }
}

/// Crescent moon + an off-register pink ring, drawn on night paper.
struct Moon: View {
  let size: CGFloat
  var body: some View {
    ZStack {
      Circle().fill(yellow).frame(width: size, height: size)
      Circle().fill(night).frame(width: size * 0.86, height: size * 0.86).offset(x: size * 0.3, y: -size * 0.22)
      Circle().stroke(pink, lineWidth: 2).frame(width: size, height: size).offset(x: 3, y: 3)
    }.frame(width: size, height: size)
  }
}

struct Kicker: View {
  let text: String; var color: Color = ink2
  var body: some View {
    Text(text.uppercased()).font(.system(size: 9.5, weight: .bold, design: .monospaced)).kerning(0.8).foregroundColor(color).lineLimit(1)
  }
}

extension View {
  /// Lock-screen accessories: transparent container (Brainyear pattern).
  @ViewBuilder func widgetBG(_ c: Color) -> some View {
    if #available(iOSApplicationExtension 17.0, *) { containerBackground(c, for: .widget) } else { background(c) }
  }
  /// Home-screen: paper/night + halftone printed edge to edge; iOS 16 gets manual margins.
  @ViewBuilder func sheetBG(_ c: Color, dots: Color, opacity: Double) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      containerBackground(for: .widget) { ZStack { c; Halftone().fill(dots).opacity(opacity) } }
    } else {
      padding(16).frame(maxWidth: .infinity, maxHeight: .infinity).background(ZStack { c; Halftone().fill(dots).opacity(opacity) })
    }
  }
}

// ── Home screen ──────────────────────────────────────────────────────
struct StartSmall: View {
  let s: Snap
  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top) {
        Kicker(text: s.tonight, color: nightMuted)
        Spacer(minLength: 0)
        Moon(size: 38)
      }
      Spacer(minLength: 4)
      Riso(text: s.start, size: 22, color: nightInk)
      if !s.next.isEmpty {
        Text(s.next).font(.system(size: 10, weight: .medium, design: .monospaced)).foregroundColor(nightMuted).lineLimit(2).minimumScaleFactor(0.8).padding(.top, 4)
      }
    }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

struct StartMedium: View {
  let s: Snap
  var body: some View {
    HStack(alignment: .center, spacing: 12) {
      VStack(alignment: .leading, spacing: 6) {
        Kicker(text: s.tonight, color: nightMuted)
        Riso(text: s.start, size: 26, color: nightInk, lines: 1)
        if !s.next.isEmpty {
          Text(s.next).font(.system(size: 12, weight: .bold)).foregroundColor(pink).lineLimit(1).minimumScaleFactor(0.7)
        }
        Text(s.hint).font(.system(size: 11, weight: .medium)).foregroundColor(nightMuted).lineLimit(2).minimumScaleFactor(0.8)
      }
      Spacer(minLength: 0)
      Moon(size: 78)
    }.frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

struct CountDots: View {
  let s: Snap
  var body: some View {
    HStack(spacing: 8) {
      dot(s.talk, pink)
      dot(s.snore, blue)
      dot(s.laugh, yellow)
    }
  }
  func dot(_ n: Int, _ c: Color) -> some View {
    HStack(spacing: 3) {
      Circle().fill(c).frame(width: 8, height: 8)
      Text("\(n)").font(.system(size: 13, weight: .black)).foregroundColor(ink)
    }
  }
}

struct ReportSmall: View {
  let s: Snap
  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(s.issue.uppercased()).font(.system(size: 9.5, weight: .bold, design: .monospaced)).foregroundColor(ink)
        .padding(.horizontal, 5).padding(.vertical, 2).background(pink).lineLimit(1)
      Spacer(minLength: 6)
      Text(s.headline).font(.system(size: s.quote.isEmpty ? 19 : 15, weight: .black)).foregroundColor(ink)
        .lineLimit(4).minimumScaleFactor(0.65)
      Spacer(minLength: 6)
      CountDots(s: s)
    }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

struct Stat: View {
  let n: Int; let label: String; let color: Color; let bg: Color
  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 5) {
      Text("\(n)").font(.system(size: 20, weight: .black)).foregroundColor(color == yellow ? ink : color)
      Text(label).font(.system(size: 10, weight: .bold, design: .monospaced)).foregroundColor(ink).lineLimit(1).minimumScaleFactor(0.7)
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 8)
    .frame(maxHeight: .infinity)
    .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(bg))
  }
}

struct ReportMedium: View {
  let s: Snap
  var body: some View {
    HStack(spacing: 12) {
      VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: 6) {
          Text(s.issue.uppercased()).font(.system(size: 9.5, weight: .bold, design: .monospaced)).foregroundColor(ink)
            .padding(.horizontal, 5).padding(.vertical, 2).background(pink).lineLimit(1)
          Kicker(text: s.title)
        }
        Spacer(minLength: 6)
        if s.quote.isEmpty {
          Riso(text: s.said, size: 22, lines: 3)
        } else {
          Text(s.headline).font(.system(size: 17, weight: .black)).foregroundColor(ink).lineLimit(4).minimumScaleFactor(0.65)
        }
        Spacer(minLength: 0)
      }.frame(maxWidth: .infinity, alignment: .leading)
      VStack(spacing: 5) {
        Stat(n: s.talk, label: s.talkL, color: pink, bg: pinkSoft)
        Stat(n: s.snore, label: s.snoreL, color: blue, bg: blueSoft)
        Stat(n: s.laugh, label: s.laughL, color: yellow, bg: yellowSoft)
      }.frame(width: 96)
    }.frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

struct SmallView: View {
  let e: Entry
  var body: some View {
    if e.snap.showsReport(e.date) {
      ReportSmall(s: e.snap).sheetBG(paper, dots: blue, opacity: 0.14).widgetURL(e.snap.url(e.date))
    } else {
      StartSmall(s: e.snap).sheetBG(night, dots: nightInk, opacity: 0.08).widgetURL(e.snap.url(e.date))
    }
  }
}

struct MediumView: View {
  let e: Entry
  var body: some View {
    if e.snap.showsReport(e.date) {
      ReportMedium(s: e.snap).sheetBG(paper, dots: blue, opacity: 0.14).widgetURL(e.snap.url(e.date))
    } else {
      StartMedium(s: e.snap).sheetBG(night, dots: nightInk, opacity: 0.08).widgetURL(e.snap.url(e.date))
    }
  }
}

// ── Lock screen ──────────────────────────────────────────────────────
struct CircularView: View {
  let e: Entry
  var body: some View {
    let report = e.snap.showsReport(e.date)
    ZStack {
      AccessoryWidgetBackground()
      if report {
        VStack(spacing: -2) {
          Text("\(e.snap.talk)").font(.system(size: 22, weight: .black)).minimumScaleFactor(0.6)
          Image(systemName: "quote.bubble.fill").font(.system(size: 10, weight: .bold))
        }
      } else {
        Image(systemName: "moon.zzz.fill").font(.system(size: 22, weight: .semibold))
      }
    }.widgetBG(.clear).widgetURL(e.snap.url(e.date))
  }
}

struct RectView: View {
  let e: Entry
  var body: some View {
    let report = e.snap.showsReport(e.date)
    VStack(alignment: .leading, spacing: 1) {
      Text(report ? e.snap.issue : e.snap.tonight).font(.system(size: 12, weight: .bold)).lineLimit(1).widgetAccentable()
      Text(report ? e.snap.headline : e.snap.start).font(.system(size: 15, weight: .black)).lineLimit(report ? 2 : 1).minimumScaleFactor(0.7)
      if report {
        Text(e.snap.counts).font(.system(size: 10.5, design: .monospaced)).lineLimit(1).minimumScaleFactor(0.7)
      } else if !e.snap.next.isEmpty {
        Text(e.snap.next).font(.system(size: 11)).lineLimit(1).minimumScaleFactor(0.8)
      }
    }.frame(maxWidth: .infinity, alignment: .leading).widgetBG(.clear).widgetURL(e.snap.url(e.date))
  }
}

struct InlineView: View {
  let e: Entry
  var body: some View {
    if e.snap.showsReport(e.date) {
      Text("#\(e.snap.n) · \(e.snap.quote.isEmpty ? e.snap.said : e.snap.quote)").widgetBG(.clear).widgetURL(e.snap.url(e.date))
    } else {
      Label(e.snap.start, systemImage: "moon.zzz.fill").widgetBG(.clear).widgetURL(e.snap.url(e.date))
    }
  }
}

struct EntryView: View {
  @Environment(\.widgetFamily) var family
  let e: Entry
  var body: some View {
    switch family {
    case .systemMedium: MediumView(e: e)
    case .accessoryCircular: CircularView(e: e)
    case .accessoryRectangular: RectView(e: e)
    case .accessoryInline: InlineView(e: e)
    default: SmallView(e: e)
    }
  }
}

@main
struct SleepTalkWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "SleepTalkWidget", provider: Provider()) { EntryView(e: $0) }
      .configurationDisplayName(NSLocalizedString("widget_name", comment: ""))
      .description(NSLocalizedString("widget_desc", comment: ""))
      .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}
