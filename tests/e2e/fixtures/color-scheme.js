// system_3 #11585: the theme attribute carries `color-scheme`, so the browser's
// own parts (scrollbars, file/date pickers, autofill) follow it. Three cases: no
// attribute, a dark root, and a light island inside that dark root. Each holds
// the native controls the story page shows, so the shots and the spec read the
// same markup.
import '../../../build/tokens.css'

const natives = (id) => `
  <div data-probe="${id}" style="padding:12px;background:var(--surface-page);color:var(--text-on-light)">
    <p>${id}</p>
    <input type="date" data-native="date" value="2026-11-17">
    <input type="file" data-native="file">
    <input type="color" data-native="color" value="#e8a317">
    <div data-native="scroll" style="height:60px;width:200px;overflow:auto;border:1px solid currentColor">
      ${'<p>row</p>'.repeat(12)}
    </div>
  </div>`

document.getElementById('app').innerHTML = `
  <section data-case="none">${natives('none')}</section>
  <section data-case="dark" data-theme="dark">
    ${natives('dark')}
    <section data-case="light-island" data-theme="light">${natives('light-island')}</section>
  </section>`
