function revealProfileSection() {
  const section = document.getElementById(location.hash.slice(1));
  if (section instanceof HTMLDetailsElement) section.open = true;
}
revealProfileSection();
window.addEventListener('hashchange', revealProfileSection);
