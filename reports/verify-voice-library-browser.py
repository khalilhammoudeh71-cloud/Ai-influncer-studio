"""Exercise the real editor/studio against the isolated fixture API."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parent
url = 'http://127.0.0.1:5175/reports/voice-library-fixture.html'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1080})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/**', lambda route: route.fulfill(json={'models': []}))
    page.goto(url)
    page.wait_for_load_state('networkidle')
    page.get_by_role('tab', name='Voice', exact=True).click()
    library = page.get_by_role('region', name='Saved persona voices')
    expect(library.get_by_role('listitem')).to_have_count(2)
    expect(library.get_by_role('button', name='Select voice: New voice')).to_be_disabled()
    library.get_by_role('button', name='Select voice: Warm original').click()
    expect(page.get_by_label('Voice name', exact=True)).to_have_value('Warm original')
    expect(page.get_by_text('Original recording', exact=True)).to_be_visible()
    page.get_by_role('button', name='Save changes', exact=True).click()
    page.wait_for_function("window.lastSaved?.voiceId === 'fixture-clone-a'")
    saved = page.evaluate('window.lastSaved')
    assert saved['voiceStability'] == 64 and saved['voiceLikeness'] == 92
    assert saved['voiceSpeakingSpeed'] == 0.95 and saved['voiceStyleExaggeration'] == 30
    assert saved['voiceSampleUrl'].endswith('/a.wav') and len(saved['savedVoices']) == 2
    page.reload()
    page.wait_for_load_state('networkidle')
    page.get_by_role('tab', name='Voice', exact=True).click()
    expect(library.get_by_role('button', name='Select voice: Warm original')).to_be_disabled()
    expect(library.get_by_role('button', name='Select voice: New voice')).to_be_enabled()
    page.screenshot(path=str(root / 'voice-library-editor.png'), full_page=True)
    page.evaluate('window.failSave = true')
    library.get_by_role('button', name='Select voice: New voice').click()
    page.get_by_role('button', name='Save changes', exact=True).click()
    expect(page.get_by_text('Fixture save failure; previous default preserved.', exact=True)).to_be_visible()
    assert page.evaluate('window.currentPersona.voiceId') == 'fixture-clone-a'
    page.reload()
    page.wait_for_load_state('networkidle')
    page.get_by_role('tab', name='Voice', exact=True).click()
    expect(library.get_by_role('button', name='Select voice: Warm original')).to_be_disabled()
    page.set_viewport_size({'width': 390, 'height': 844})
    library.scroll_into_view_if_needed()
    expect(library.get_by_role('button', name='Select voice: New voice')).to_be_visible()
    box = library.bounding_box()
    assert box['x'] >= 0 and box['x'] + box['width'] <= 391
    page.screenshot(path=str(root / 'voice-library-mobile.png'), full_page=True)
    print('PASS: editor selection, original recordings/settings, reload, failed save preservation, and mobile library layout.')
    page.set_viewport_size({'width': 1440, 'height': 1080})
    page.goto(url + '?studio')
    page.wait_for_load_state('networkidle')
    print('STUDIO BUTTONS:', page.get_by_role('button').all_text_contents())
    page.get_by_role('button', name='Start Voice Studio').click()
    expect(library.get_by_role('button', name='Use as default: Warm original')).to_be_disabled()
    library.get_by_role('button', name='Use as default: New voice').click()
    page.wait_for_function("window.lastSaved?.voiceId === 'fixture-clone-b'")
    expect(library.get_by_role('button', name='Use as default: New voice')).to_be_disabled()
    expect(library.get_by_role('button', name='Use as default: Warm original')).to_be_enabled()
    assert page.evaluate('window.lastSaved.voiceSampleUrl').endswith('/b.wav')
    assert page.evaluate('window.lastSaved.voiceStability') == 25
    page.screenshot(path=str(root / 'voice-library-studio.png'), full_page=True)
    page.reload()
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Start Voice Studio').click()
    expect(library.get_by_role('button', name='Use as default: New voice')).to_be_disabled()
    assert not errors, errors
    print('PASS: Voice Studio restores the default, refresh keeps both voices, no browser runtime errors.')
    browser.close()
