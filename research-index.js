(() => {
  const search = document.getElementById('study-query');
  const count = document.getElementById('study-count');
  const topic = document.getElementById('study-topic');
  const groups = document.querySelectorAll('.area');
  const studies = Array.from(document.querySelectorAll('.entry'));
  const normalize = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');


  function update() {
    const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    let matches = 0;
    for (const study of studies) {
      const text = normalize(study.textContent + ' ' + study.dataset.topic);
      const sameTopic = topic.value === 'All areas' || topic.value === study.dataset.topic;
      study.hidden = !(sameTopic && terms.every(term => text.includes(term)));
      if (!study.hidden) matches++;
    }
    for (const group of groups) group.hidden = !group.querySelector('.entry:not([hidden])');
    count.textContent = matches ? (matches === studies.length ? '' : matches + ' of ' + studies.length + ' studies') : 'No matches. Try another term or select All areas.';
  }

  topic.addEventListener('change', update);
  search.addEventListener('input', update);
  update();
})();
