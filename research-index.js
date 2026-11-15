(() => {
  const search = document.getElementById('study-query');
  const count = document.getElementById('study-count');
  const buttons = Array.from(document.querySelectorAll('.filters button'));
  const studies = Array.from(document.querySelectorAll('.entry'));
  const normalize = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  let topic = 'All studies';

  function update() {
    const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    let matches = 0;
    for (const study of studies) {
      const text = normalize(study.textContent + ' ' + study.dataset.topic);
      const sameTopic = topic === 'All studies' || topic === study.dataset.topic;
      study.hidden = !(sameTopic && terms.every(term => text.includes(term)));
      if (!study.hidden) matches++;
    }
    count.textContent = matches ? matches + ' of ' + studies.length + ' studies' : 'No matches. Try another term or select All studies.';
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      topic = button.textContent.trim();
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      update();
    });
  }
  search.addEventListener('input', update);
  update();
})();
