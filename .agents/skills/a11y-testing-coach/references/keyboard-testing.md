# Keyboard Testing

## Keyboard Testing

This does NOT require a screen reader. Test keyboard access independently.

### The 5-Minute Keyboard Test

1. **Unplug your mouse** (or don't touch it)
2. **Press Tab** - Can you see where focus is? If not, the focus indicator is missing or insufficient
3. **Tab through the entire page** - Can you reach every interactive element?
4. **Press Enter/Space** on every button and link - Do they work?
5. **Press Escape** on any overlay - Does it close?
6. **Press Tab after closing an overlay** - Does focus return to the trigger?

### What Each Key Should Do

| Key | Expected Behavior |
|-----|-------------------|
| Tab | Move to next interactive element |
| Shift+Tab | Move to previous interactive element |
| Enter | Activate link or button |
| Space | Activate button, toggle checkbox, open select |
| Escape | Close modal/dropdown/popover |
| Arrow keys | Navigate within a widget (tabs, radio group, menu, grid) |
| Home/End | Jump to first/last item in a list or menu |

### Keyboard Traps

A keyboard trap occurs when Tab gets stuck in a loop or a section with no exit. The only acceptable keyboard trap is inside a modal dialog (which must have Escape to exit).

Test for traps:
1. Tab into every component
2. Verify you can Tab out of it
3. Pay special attention to: iframes, embedded widgets, custom dropdown menus, date pickers, rich text editors

### Custom Widget Keyboard Patterns

When testing custom widgets, verify they follow the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/):

| Widget | Expected Keyboard |
|--------|-------------------|
| Tabs | Arrow keys switch tabs, Tab moves to tab panel |
| Accordion | Enter/Space toggles, Arrow keys navigate headers |
| Menu | Arrow keys navigate, Enter selects, Escape closes |
| Dialog | Tab trapped inside, Escape closes, focus returns |
| Combobox | Arrow keys navigate options, Enter selects, Escape closes |
| Tree view | Arrow keys navigate, Enter expands/collapses |
| Slider | Arrow keys adjust value, Home/End for min/max |

---

