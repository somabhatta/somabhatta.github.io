(() => {
  const pages = {
    "research": "research.html",
    "publications": "publications.html",
    "talks": "talks.html",
    "awards": "about.html#awards",
    "service": "about.html#service",
    "news": "about.html#news",
    "skills": "about.html#skills",
    "hobbies": "about.html#hobbies",
    "biography": "about.html"
};
  function followBookmark() {
    const key = location.hash.slice(1);
    if (Object.hasOwn(pages, key)) location.replace(pages[key]);
    else if (location.pathname.endsWith('/profile.html')) location.replace('about.html');
  }
  followBookmark();
  window.addEventListener('hashchange', followBookmark);
})();
