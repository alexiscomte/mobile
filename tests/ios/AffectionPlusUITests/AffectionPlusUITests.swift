import XCTest
import UIKit

/// Run against the Release app already installed on a dedicated audit simulator.
/// Standard checks need no account. The optional demo-account scenario has a separate runner.
@MainActor
final class AffectionPlusUITests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "com.affectionplus.app")

    override func setUpWithError() throws {
        continueAfterFailure = true
        app.launch()
        app.open(URL(string: "affectionplus:///")!)
        XCTAssertTrue(app.scrollViews.firstMatch.waitForExistence(timeout: 30))
    }

    func evidence(_ name: String) {
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = name
        screenshot.lifetime = .keepAlways
        add(screenshot)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = name + "-accessibility"
        tree.lifetime = .keepAlways
        add(tree)
    }

    func testHomeAndTabNavigation() throws {
        if UIDevice.current.userInterfaceIdiom != .pad { XCTAssertEqual(app.tabBars.buttons.count, 5) }
        evidence("home")
        for index in 1..<5 {
            selectTab(index)
            XCTAssertTrue(app.scrollViews.firstMatch.waitForExistence(timeout: 10))
            evidence("tab-\(index)")
        }
        selectTab(0)
    }

    func selectTab(_ index: Int) {
        if UIDevice.current.userInterfaceIdiom == .pad {
            // iPadOS exposes the native floating tab strip as individual buttons.
            app.buttons[["Accueil", "Astro", "Jeux", "Infos", "Moi"][index]].firstMatch.tap()
        } else {
            app.tabBars.buttons.element(boundBy: index).tap()
        }
    }

    func testHomeAccessibility() throws {
        evidence("accessibility-home")
        try audit("home")
    }

    func audit(_ name: String) throws {
        var issues: [String] = []
        var systemNotes: [String] = []
        try app.performAccessibilityAudit(for: [.contrast, .hitRegion, .sufficientElementDescription, .textClipped, .trait]) { issue in
            // iOS 27's compact time picker reports an internal UILabel with no AX element.
            // Reproduced with the hour shown; absent when that native picker is removed.
            // Keep the finding in the report, and check the complete native value below.
            if name.hasSuffix("mes-infos"), issue.auditType == .textClipped, issue.element == nil,
               ProcessInfo.processInfo.operatingSystemVersion.majorVersion == 27,
               self.app.datePickers.count == 2, systemNotes.isEmpty,
               issue.detailedDescription == "Text of this UILabel may be clipped at larger Dynamic Type sizes." {
                systemNotes.append("UIKit compact time picker: " + issue.detailedDescription)
                return true
            }
            issues.append("\(issue.auditType.rawValue): \(issue.compactDescription) — \(issue.element?.label ?? issue.detailedDescription) \(String(describing: issue.element?.frame))")
            return true // Collect every finding; assert the complete list below.
        }
        let report = XCTAttachment(string: (issues + systemNotes).joined(separator: "\n"))
        report.name = name + "-audit"
        report.lifetime = .keepAlways
        add(report)
        if !systemNotes.isEmpty {
            let timeValue = (app.datePickers.element(boundBy: 1).buttons.firstMatch.value as? String)?
                .trimmingCharacters(in: .whitespacesAndNewlines)
            // The French audit environment uses HH:mm; accept the complete 12-hour
            // value too when the simulator's regional setting supplies AM/PM.
            let completeTime = #"^(?:[01]?[0-9]|2[0-3]):[0-5][0-9](?:[\s\u00A0\u202F]*(?:AM|PM|am|pm))?$"#
            XCTAssertNotNil(timeValue?.range(of: completeTime, options: .regularExpression),
                            "The native time picker must expose a complete hour and minute value")
        }
        XCTAssertTrue(issues.isEmpty, "\(name): \(issues.joined(separator: "\n"))")
    }

    func testReadOnlyScreens() throws {
        for route in ["mes-infos", "theme", "biorythme", "garde", "quiz", "sondages", "article?u=fr/conseils/index.html"] {
            app.open(URL(string: "affectionplus:///" + route)!)
            XCTAssertTrue(app.scrollViews.firstMatch.waitForExistence(timeout: 15))
            evidence(route.replacingOccurrences(of: "/", with: "-"))
            try audit(route)
        }
    }

    func testLandscapeLayout() throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else {
            throw XCTSkip("The iPhone app intentionally supports portrait only")
        }
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        XCTAssertTrue(app.scrollViews.firstMatch.waitForExistence(timeout: 10))
        XCTAssertGreaterThan(app.frame.width, app.frame.height)
        evidence("landscape-home")
        try audit("landscape-home")
    }

    func testAllNineLanguages() throws {
        guard UIDevice.current.userInterfaceIdiom != .pad else { throw XCTSkip("Language matrix runs on iPhone") }
        let languages = ["English", "Deutsch", "Español", "Italiano", "Português", "Nederlands", "Polski", "Türkçe", "Français"]
        for language in languages {
            app.tabBars.buttons.element(boundBy: 4).tap()
            let choice = app.buttons[language].firstMatch
            for _ in 0..<4 where !choice.isHittable { app.scrollViews.firstMatch.swipeUp() }
            XCTAssertTrue(choice.isHittable, "Language selector: \(language)")
            choice.tap()
            app.tabBars.buttons.element(boundBy: 0).tap()
            XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Camille")).firstMatch.waitForExistence(timeout: 10))
            evidence("language-\(language)")
            try audit("language-\(language)")
        }
    }

    func testTabAccessibility() throws {
        for index in 1..<5 {
            selectTab(index)
            evidence("audit-tab-\(index)")
            try audit("tab-\(index)")
        }
    }

    func testCalendarFlow() throws {
        app.open(URL(string: "affectionplus:///garde")!)
        let date = app.datePickers.firstMatch
        XCTAssertTrue(date.waitForExistence(timeout: 10))
        for _ in 0..<16 where !date.isHittable { app.scrollViews.firstMatch.swipeUp() }
        date.tap()
        app.buttons["lundi 3 janvier"].tap()
        let dismiss = app.buttons["PopoverDismissRegion"]
        if dismiss.exists {
            dismiss.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.95)).tap()
        }
        let first = app.textFields["Parent qui commence"]
        first.tap()
        first.typeText("Alexandrine-Dominique")
        let second = app.textFields["Autre parent"]
        second.tap()
        second.typeText("Jean-Christophe\n")
        app.scrollViews.firstMatch.swipeUp()
        let calculate = app.buttons["Afficher le calendrier"]
        for _ in 0..<8 where !calculate.isHittable { app.scrollViews.firstMatch.swipeUp() }
        calculate.tap()
        let day = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "lundi 3 janvier 2000,")).firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 10))
        for _ in 0..<10 where !day.isHittable { app.scrollViews.firstMatch.swipeUp() }
        XCTAssertTrue(day.label.contains("Alexandrine-Dominique"))
        XCTAssertFalse(app.keyboards.firstMatch.exists)
        evidence("calendar-long-names")
        try audit("calendar-results")
    }

    func testAccountSignIn() throws {
        guard ProcessInfo.processInfo.environment["AUDIT_ACCOUNT"] == "1" else {
            throw XCTSkip("Requires the dedicated test account simulator")
        }
        app.open(URL(string: "affectionplus:///compte")!)
        let signedIn = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Changer mon mot de passe")).firstMatch
        if !signedIn.exists {
        let signIn = app.buttons["Se connecter"].firstMatch
        XCTAssertTrue(signIn.waitForExistence(timeout: 15))
        signIn.tap()
        let continueButton = app.alerts.buttons["Continuer"]
        if continueButton.waitForExistence(timeout: 3) { continueButton.tap() }
        let email = app.webViews.textFields.firstMatch
        XCTAssertTrue(email.waitForExistence(timeout: 30))
        guard let address = ProcessInfo.processInfo.environment["AUDIT_EMAIL"],
              let password = ProcessInfo.processInfo.environment["AUDIT_PASSWORD"] else {
            throw XCTSkip("Credentials are supplied only by the private account runner")
        }
        email.tap()
        email.typeText(address)
        let secure = app.webViews.secureTextFields.firstMatch
        XCTAssertTrue(secure.exists)
        secure.tap()
        secure.typeText(password)
        app.webViews.buttons["Se connecter"].tap()
        }
        XCTAssertTrue(signedIn.waitForExistence(timeout: 30))
        for route in ["mes-infos", "favoris", "outils", "connexions", "mot-de-passe"] {
            app.open(URL(string: "affectionplus:///" + route)!)
            XCTAssertTrue(app.scrollViews.firstMatch.waitForExistence(timeout: 15))
            try audit("account-" + route)
        }
    }

    func testDateTimePickerAudit() throws {
        app.open(URL(string: "affectionplus:///mes-infos")!)
        let toggle = app.switches["Heure de naissance"].firstMatch
        XCTAssertTrue(toggle.waitForExistence(timeout: 10))
        toggle.tap()
        evidence("form-time-unknown")
        try audit("form-time-unknown")
    }

    func testProfileDateAfterScrolling() throws {
        app.open(URL(string: "affectionplus:///mes-infos")!)
        let date = app.datePickers.firstMatch
        XCTAssertTrue(date.waitForExistence(timeout: 10))
        for _ in 0..<16 where !date.isHittable { app.scrollViews.firstMatch.swipeUp() }
        XCTAssertTrue(date.isHittable)
        evidence("profile-date-scrolled")
        try audit("scrolled-mes-infos")
    }

    func testIPadWindowLayout() throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else { throw XCTSkip("iPad only") }
        maximizeIPadWindow()
        let original = app.windows.firstMatch.frame
        defer { maximizeIPadWindow() }
        app.windows.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.995, dy: 0.995))
            .press(forDuration: 0.2, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.6, dy: 0.75)))
        let resized = NSPredicate { _, _ in self.app.windows.firstMatch.frame.width < original.width - 80 }
        XCTAssertTrue(expectation(for: resized, evaluatedWith: nil).waitUntilSatisfied(timeout: 10))
        let heading = app.staticTexts["Bonjour Camille"].firstMatch
        XCTAssertTrue(heading.exists)
        XCTAssertGreaterThanOrEqual(heading.frame.minY - app.windows.firstMatch.frame.minY, 44,
                                    "The heading must clear the iPad window controls")
        evidence("ipad-window-resized")
        try audit("ipad-window-resized")
        for index in 1..<5 {
            selectTab(index)
            try audit("ipad-window-tab-\(index)")
        }
        selectTab(0)
    }

    func maximizeIPadWindow() {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let fullWidth = springboard.frame.width
        guard app.windows.firstMatch.frame.width < fullWidth - 20 else { return }
        // Expand the native compact window controls, then use their accessible zoom button.
        app.windows.firstMatch.coordinate(withNormalizedOffset: .zero)
            .withOffset(CGVector(dx: 40, dy: 32)).tap()
        springboard.buttons["Zoom-button"].tap()
        let full = NSPredicate { _, _ in self.app.windows.firstMatch.frame.width >= fullWidth - 20 }
        XCTAssertTrue(expectation(for: full, evaluatedWith: nil).waitUntilSatisfied(timeout: 10))
    }

    /// The shell runner changes the simulator size after this test prints its marker.
    func testDynamicTypeHotChange() throws {
        guard ProcessInfo.processInfo.environment["AUDIT_DYNAMIC_TYPE"] == "1" else {
            throw XCTSkip("Run with scripts/test-ios-dynamic-type.py")
        }
        app.open(URL(string: "affectionplus:///mes-infos")!)
        let field = app.textFields["Prénom"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 15))
        field.tap()
        field.typeText("-brouillon")
        let draft = field.value as? String
        let label = app.staticTexts["Prénom"].firstMatch
        let initialHeight = label.frame.height
        FileHandle.standardOutput.write(Data("FONT_CHANGE_READY\n".utf8))
        let enlarged = NSPredicate { _, _ in label.frame.height > initialHeight * 1.5 }
        XCTAssertTrue(expectation(for: enlarged, evaluatedWith: nil).waitUntilSatisfied(timeout: 30))
        XCTAssertEqual(field.value as? String, draft, "Changing Dynamic Type must preserve the unsaved form")
        evidence("dynamic-type-hot-change")
        FileHandle.standardOutput.write(Data("FONT_RESTORE_READY\n".utf8))
        let restored = NSPredicate { _, _ in abs(label.frame.height - initialHeight) < 2 }
        XCTAssertTrue(expectation(for: restored, evaluatedWith: nil).waitUntilSatisfied(timeout: 30))
        XCTAssertEqual(field.value as? String, draft)
    }

    func testVoiceOverReadingOrder() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver automation requires iOS 27") }
        let service = XCUIDevice.shared.voiceOverService
        try service.enable()
        defer { try? service.disable() }
        var speech: [String] = []
        for _ in 0..<15 {
            speech.append(try service.moveForward().utterance)
        }
        let transcript = XCTAttachment(string: speech.joined(separator: "\n"))
        transcript.name = "voiceover-home"
        transcript.lifetime = .keepAlways
        add(transcript)
        XCTAssertFalse(speech.filter { !$0.isEmpty }.isEmpty, "VoiceOver must announce the screen elements")
    }
}

private extension XCTestExpectation {
    func waitUntilSatisfied(timeout: TimeInterval) -> Bool {
        XCTWaiter.wait(for: [self], timeout: timeout) == .completed
    }
}
