(() => {
  /* ---------- config ---------- */

  const API_BASE = "https://site-da7f266cd38645a88d82577d4531a2db.freebuff.page";
  const CACHE_KEY = "zen.data";

  // Spotify Web API. Fill both values after running the one-time connect step at
  // /spotify.html; while they are empty the card falls back to Lanyard.
  const SPOTIFY_CLIENT_ID = "5bf154790c7d4c93aef732d4a1af3925";
  const SPOTIFY_REFRESH_TOKEN = "AQCcEvgTcNvodMzrfSVIzK3CorzCqKse3jHr7SlqQUJOYcjM9Da7_oNbdnaVv-lM_2c-hrjQoX36JvV2m9-juRqvH-HyjP57eAiiJOGLT6Ei91HKY6eh7VIqc1jGXlCFBVQ";
  const spotifyReady = Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_REFRESH_TOKEN);

  const DEFAULTS = {
    handle: "@rebornzen",
    bio: "yooo wsp",
    location: "Tokyo, Japan",
    views: 0,
    lastfm: "",
    song: "assets/raininglol.mp3",
    songKey: "",
    songName: "raininglol",
    background: "",
    backgroundKey: "",
    backgroundName: "",
    backgroundKind: "",
  };

  /* ---------- elements ---------- */

  const loader = document.getElementById("loader");
  const audioBtn = document.getElementById("audioBtn");
  const song = document.getElementById("song");
  const views = document.getElementById("views");
  const nameEl = document.querySelector(".name");
  const card = document.querySelector(".card");
  const tiltBox = document.getElementById("tiltBox");

  const handleEl = document.getElementById("handle");
  const bioEl = document.getElementById("bio");
  const locationEl = document.getElementById("location");
  const descriptionMeta = document.querySelector('meta[name="description"]');

  const discordPill = document.getElementById("discord");
  const discordLabel = document.getElementById("discordLabel");
  const avatarImg = document.getElementById("avatar");
  const decorationImg = document.getElementById("avatarDecoration");
  const favicon = document.getElementById("favicon");

  const spotifyCard = document.getElementById("spotifyCard");
  const spotifyArt = document.getElementById("spotifyArt");
  const spotifyTrackEl = document.getElementById("spotifyTrack");
  const spotifyArtistEl = document.getElementById("spotifyArtist");
  const spotifyFill = document.getElementById("spotifyFill");

  const adminEl = document.getElementById("admin");
  const adminForm = document.getElementById("adminForm");
  const adminKeyField = document.getElementById("adminKeyField");
  const adminKeyInput = document.getElementById("adminKey");
  const adminHandleField = document.getElementById("adminHandleField");
  const adminBioField = document.getElementById("adminBioField");
  const adminLocationField = document.getElementById("adminLocationField");
  const adminLastfmField = document.getElementById("adminLastfmField");
  const adminViewsField = document.getElementById("adminViewsField");
  const adminHandleInput = document.getElementById("adminHandle");
  const adminBioInput = document.getElementById("adminBio");
  const adminLocationInput = document.getElementById("adminLocation");
  const adminLastfmInput = document.getElementById("adminLastfm");
  const adminViewsInput = document.getElementById("adminViews");
  const adminSongField = document.getElementById("adminSongField");
  const adminSongSelect = document.getElementById("adminSong");
  const adminSongUploadField = document.getElementById("adminSongUploadField");
  const adminSongFile = document.getElementById("adminSongFile");
  const adminBackgroundField = document.getElementById("adminBackgroundField");
  const adminBackgroundSelect = document.getElementById("adminBackground");
  const adminBackgroundUploadField = document.getElementById("adminBackgroundUploadField");
  const adminBackgroundFile = document.getElementById("adminBackgroundFile");
  const adminResetBtn = document.getElementById("adminReset");
  const adminHint = document.getElementById("adminHint");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const formatViews = (n) => new Intl.NumberFormat("en-US").format(n);

  // Views come from the API. ?views=N overrides the count for that visit only.
  const viewsParam = new URLSearchParams(window.location.search).get("views");
  const VIEWS_OVERRIDE =
    viewsParam !== null && String(viewsParam).trim() !== "" && Number.isFinite(Number(viewsParam))
      ? Math.max(0, Math.floor(Number(viewsParam)))
      : null;

  const state = { ...DEFAULTS };

  let entered = false;
  let viewsLocked = false;
  let adminUnlocked = false;
  let adminSecret = "";
  let songs = [];
  let songsLoading = false;
  let backgrounds = [];
  let backgroundsLoading = false;

  /* ---------- profile cache ---------- */

  function readCache() {
    try {
      const data = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null");
      return data && typeof data === "object" ? data : null;
    } catch (err) {
      return null;
    }
  }

  function writeCache() {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    } catch (err) {
      /* private mode: the API stays authoritative anyway */
    }
  }

  function applyProfile(data) {
    if (!data) return;

    if (typeof data.handle === "string" && data.handle.trim()) {
      state.handle = data.handle.trim();
      if (handleEl) handleEl.textContent = state.handle;
    }

    if (typeof data.bio === "string") {
      state.bio = data.bio;
      if (bioEl) bioEl.textContent = data.bio;
      if (descriptionMeta) descriptionMeta.setAttribute("content", data.bio);
    }

    if (typeof data.location === "string" && data.location.trim()) {
      state.location = data.location.trim();
      if (locationEl) locationEl.textContent = state.location;
    }

    if (typeof data.lastfm === "string") {
      state.lastfm = data.lastfm.trim();
    }

    if (typeof data.songKey === "string") {
      state.songKey = data.songKey.trim();
    }

    if (typeof data.songName === "string" && data.songName.trim()) {
      state.songName = data.songName.trim();
    }

    if (typeof data.song === "string" && data.song.trim()) {
      state.song = data.song.trim();
      applySong(state.song);
    }

    if (typeof data.background === "string") {
      state.background = data.background.trim();
    }

    if (typeof data.backgroundKey === "string") {
      state.backgroundKey = data.backgroundKey.trim();
    }

    if (typeof data.backgroundName === "string") {
      state.backgroundName = data.backgroundName.trim();
    }

    if (typeof data.backgroundKind === "string") {
      state.backgroundKind = data.backgroundKind.trim();
    }

    if (VIEWS_OVERRIDE !== null) {
      state.views = VIEWS_OVERRIDE;
      if (!entered) views.textContent = formatViews(VIEWS_OVERRIDE);
    } else {
      const nextViews = Number(data.views);
      if (Number.isFinite(nextViews) && nextViews >= 0) {
        state.views = Math.floor(nextViews);
        if (!entered) views.textContent = formatViews(state.views);
      }
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch(`${API_BASE}/api/profile`, { cache: "no-store" });
      if (!res.ok) throw new Error(`profile ${res.status}`);

      const data = await res.json();
      applyProfile(data);
      writeCache();
    } catch (err) {
      /* keep whatever the cache or markup already shows */
    }
  }

  async function bumpViews() {
    try {
      const res = await fetch(`${API_BASE}/api/views`, { method: "POST" });
      if (!res.ok) throw new Error(`views ${res.status}`);

      const data = await res.json();
      const next = Number(data.views);
      if (!Number.isFinite(next)) throw new Error("bad views payload");

      state.views = Math.floor(next);
      writeCache();
      return state.views;
    } catch (err) {
      return state.views;
    }
  }

  if (VIEWS_OVERRIDE !== null) {
    state.views = VIEWS_OVERRIDE;
    if (views) views.textContent = formatViews(VIEWS_OVERRIDE);
  }

  applyProfile(readCache());
  loadProfile();

  /* ---------- view counter ---------- */

  function countUp(el, target, duration = 1400) {
    const start = performance.now();
    const from = 0;

    function frame(now) {
      if (viewsLocked) return;

      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);

      el.textContent = formatViews(Math.round(from + (target - from) * eased));

      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = formatViews(target);
    }

    requestAnimationFrame(frame);
  }

  /* ---------- typewriter name ---------- */

  function startTyping() {
    if (!nameEl || reducedMotion) return;

    const full = nameEl.textContent.trim();
    if (!full) return;

    // reserve the finished width (plus the caret) so the badges don't jitter
    const width = nameEl.getBoundingClientRect().width;
    nameEl.textContent = "";
    if (width) nameEl.style.minWidth = Math.ceil(width + 9) + "px";
    nameEl.classList.add("is-typing");

    let i = 0;

    function typeNext() {
      if (i >= full.length) {
        window.setTimeout(() => {
          nameEl.classList.remove("is-typing");
          // drop the reserved width so the name sits centred again
          nameEl.style.minWidth = "";
        }, 1500);
        return;
      }
      i += 1;
      nameEl.textContent = full.slice(0, i);
      window.setTimeout(typeNext, i === 1 ? 240 : 150);
    }

    window.setTimeout(typeNext, 300);
  }

  /* ---------- audio ---------- */

  function applySong(url) {
    if (!url || !song) return;

    let current = "";
    let next = "";

    try {
      current = new URL(song.currentSrc || song.src || "", window.location.href).href;
      next = new URL(url, window.location.href).href;
    } catch (err) {
      return;
    }

    if (!next || current === next) return;

    const wasPlaying = !song.paused;
    song.src = url;
    song.load();

    if (wasPlaying) {
      const started = song.play();
      if (started && typeof started.then === "function") started.catch(syncAudio);
    }

    syncAudio();
  }

  function syncAudio() {
    const playing = !song.paused;
    audioBtn.classList.toggle("is-playing", playing);
    audioBtn.setAttribute("aria-pressed", String(playing));
    audioBtn.setAttribute("aria-label", playing ? "Pause profile song" : "Play profile song");
  }

  audioBtn.addEventListener("click", async () => {
    if (song.paused) {
      try {
        await song.play();
      } catch (err) {
        /* playback blocked or unsupported */
      }
    } else {
      song.pause();
    }
    syncAudio();
  });

  song.addEventListener("play", syncAudio);
  song.addEventListener("pause", syncAudio);
  song.addEventListener("ended", syncAudio);

  /* ---------- click to enter ---------- */

  function enter() {
    if (entered) return;
    entered = true;

    document.body.classList.add("is-ready");
    loader.classList.add("is-done");
    window.setTimeout(() => loader.remove(), 700);

    if (VIEWS_OVERRIDE !== null) {
      state.views = VIEWS_OVERRIDE;
      viewsLocked = true;
      views.textContent = formatViews(VIEWS_OVERRIDE);
    } else {
      const optimistic = state.views + 1;
      views.textContent = "0";
      countUp(views, optimistic);

      bumpViews().then((actual) => {
        if (actual !== optimistic) {
          viewsLocked = true;
          views.textContent = formatViews(actual);
        }
      });
    }

    startTyping();

    // this click is the user gesture, so the song is allowed to start
    const started = song.play();
    if (started && typeof started.then === "function") {
      started.then(syncAudio).catch(syncAudio);
    } else {
      syncAudio();
    }
  }

  loader.addEventListener("click", enter);
  loader.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      enter();
    }
  });

  /* ---------- discord status + avatar ---------- */

  const DISCORD_ID = "945118422331686962";
  const presenceUrl = `https://api.lanyard.rest/v1/users/${DISCORD_ID}`;

  const STATUS_LABEL = { online: "online", idle: "idle", dnd: "dnd", offline: "offline" };

  function discordAvatar(user, size) {
    if (!user) return "";

    if (!user.avatar) {
      // default Discord avatar: discriminator % 5 for legacy accounts, id-based otherwise
      const index =
        user.discriminator && user.discriminator !== "0"
          ? Number(user.discriminator) % 5
          : Number((BigInt(user.id) >> 22n) % 6n);
      return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }

    const ext = user.avatar.startsWith("a_") ? "gif" : "webp";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
  }

  let liveAvatar = "";

  function decorationUrl(user) {
    const asset = user && user.avatar_decoration_data && user.avatar_decoration_data.asset;
    return asset
      ? `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=240&passthrough=true`
      : "";
  }

  let liveDecoration = "";

  function applyDecoration(user) {
    if (!decorationImg) return;

    const url = decorationUrl(user);
    if (!url) {
      if (liveDecoration) {
        liveDecoration = "";
        decorationImg.hidden = true;
        decorationImg.removeAttribute("src");
      }
      return;
    }
    if (url === liveDecoration) return;

    // same trick as the avatar: only show it once the preset really loads
    const probe = new Image();
    probe.onload = () => {
      liveDecoration = url;
      decorationImg.src = url;
      decorationImg.hidden = false;
    };
    probe.src = url;
  }

  function applyAvatar(user) {
    applyDecoration(user);

    const url = discordAvatar(user, 512);
    if (!url || url === liveAvatar || !avatarImg) return;

    // only swap once the Discord image has actually downloaded
    const probe = new Image();
    probe.onload = () => {
      liveAvatar = url;
      avatarImg.src = url;
      if (favicon) favicon.href = url;
    };
    probe.src = url;
  }

  function applyStatus(status, user) {
    const key = STATUS_LABEL[status] ? status : "offline";
    if (discordPill) {
      discordPill.dataset.status = key;
      const who = user && (user.global_name || user.username);
      discordPill.title = who ? `Discord: ${who} — ${key}` : "Discord status";
    }
    if (discordLabel) discordLabel.textContent = STATUS_LABEL[key];
  }

  /* ---------- spotify web api ---------- */

  const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
  const SPOTIFY_NOW_URL =
    "https://api.spotify.com/v1/me/player/currently-playing?additional_types=track";

  let spotifyToken = "";
  let spotifyTokenExpires = 0;
  let spotifyTokenRequest = null;

  // the refresh token is swapped for a short-lived access token in the browser,
  // so no server and no client secret are involved
  async function spotifyAccessToken() {
    if (!spotifyReady) return "";
    if (spotifyToken && Date.now() < spotifyTokenExpires) return spotifyToken;
    if (spotifyTokenRequest) return spotifyTokenRequest;

    spotifyTokenRequest = (async () => {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: SPOTIFY_REFRESH_TOKEN,
        client_id: SPOTIFY_CLIENT_ID,
      });
      const res = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`spotify token ${res.status}`);
      const data = await res.json();
      if (!data.access_token) throw new Error("spotify token missing");

      spotifyToken = data.access_token;
      // renew a minute early so a request never lands on an expired token
      const life = Math.max(60, (data.expires_in || 3600) - 60);
      spotifyTokenExpires = Date.now() + life * 1000;
      return spotifyToken;
    })();

    try {
      return await spotifyTokenRequest;
    } catch (err) {
      spotifyToken = "";
      spotifyTokenExpires = 0;
      throw err;
    } finally {
      spotifyTokenRequest = null;
    }
  }

  function spotifyShape(payload) {
    const item = payload && payload.item;
    if (!item) return null;

    const artists =
      (item.artists || []).map((one) => one && one.name).filter(Boolean).join(", ") ||
      (item.show && item.show.name) ||
      "";
    const images =
      (item.album && item.album.images) || item.images || [];
    const art = images.length ? (images[1] || images[0]).url : "";

    const duration = item.duration_ms || 0;
    const played = Math.min(payload.progress_ms || 0, duration);
    const now = Date.now();

    return {
      song: item.name || "",
      artist: artists,
      album: (item.album && item.album.name) || (item.show && item.show.name) || "",
      album_art_url: art,
      track_url: (item.external_urls && item.external_urls.spotify) || "",
      timestamps: duration
        ? { start: now - played, end: now - played + duration }
        : null,
    };
  }

  async function refreshSpotify() {
    if (!spotifyReady) return;

    try {
      const token = await spotifyAccessToken();
      const res = await fetch(SPOTIFY_NOW_URL, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (res.status === 401) {
        spotifyToken = "";
        spotifyTokenExpires = 0;
        throw new Error("spotify 401");
      }
      // nothing playing: Spotify answers 204
      if (res.status === 204) {
        renderSpotify(null);
        return;
      }
      if (!res.ok) throw new Error(`spotify ${res.status}`);

      const payload = await res.json();
      renderSpotify(payload && payload.is_playing ? spotifyShape(payload) : null);
    } catch (err) {
      // keep the last known track on screen and try again on the next poll
    }
  }

  /* ---------- spotify now playing ---------- */

  let spotifyStart = 0;
  let spotifyEnd = 0;

  function paintSpotifyProgress() {
    if (!spotifyFill) return;
    if (!spotifyStart || !spotifyEnd || spotifyEnd <= spotifyStart) {
      spotifyFill.style.transform = "scaleX(0)";
      return;
    }
    const pct = (Date.now() - spotifyStart) / (spotifyEnd - spotifyStart);
    spotifyFill.style.transform = `scaleX(${Math.min(1, Math.max(0, pct))})`;
  }

  function showSpotifyIdle() {
    if (!spotifyCard) return;

    spotifyStart = 0;
    spotifyEnd = 0;
    spotifyCard.dataset.state = "idle";
    spotifyCard.removeAttribute("href");
    spotifyCard.setAttribute("aria-label", "Spotify — not playing");

    if (spotifyArt) {
      spotifyArt.hidden = true;
      spotifyArt.removeAttribute("src");
    }
    if (spotifyTrackEl) spotifyTrackEl.textContent = "not playing";
    if (spotifyArtistEl) spotifyArtistEl.textContent = "spotify";
    paintSpotifyProgress();
  }

  function renderSpotify(track) {
    if (!spotifyCard) return;

    if (!track || !track.song) {
      showSpotifyIdle();
      return;
    }

    spotifyCard.dataset.state = "playing";
    if (track.track_url) {
      spotifyCard.href = track.track_url;
      spotifyCard.target = "_blank";
      spotifyCard.rel = "noopener noreferrer";
    }
    if (spotifyTrackEl) spotifyTrackEl.textContent = track.song;
    if (spotifyArtistEl) spotifyArtistEl.textContent = track.artist || "spotify";
    spotifyCard.setAttribute(
      "aria-label",
      `Playing ${track.song}${track.artist ? " by " + track.artist : ""} on Spotify`
    );

    const art = track.album_art_url;
    if (spotifyArt && art && spotifyArt.getAttribute("src") !== art) {
      spotifyArt.onload = () => {
        spotifyArt.hidden = false;
      };
      spotifyArt.onerror = () => {
        spotifyArt.hidden = true;
      };
      spotifyArt.src = art;
    }

    const stamps = track.timestamps || {};
    spotifyStart = stamps.start || 0;
    spotifyEnd = stamps.end || 0;
    paintSpotifyProgress();
  }

  window.setInterval(paintSpotifyProgress, 1000);

  if (spotifyReady) {
    refreshSpotify();
    window.setInterval(refreshSpotify, 10000);
    window.addEventListener("focus", refreshSpotify);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshSpotify();
    });
  }

  async function refreshPresence() {
    try {
      const res = await fetch(presenceUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`lanyard ${res.status}`);
      const payload = await res.json();
      if (!payload.success || !payload.data) throw new Error("no presence data");

      applyStatus(payload.data.discord_status, payload.data.discord_user);
      applyAvatar(payload.data.discord_user);
      // with Spotify wired up the Web API owns the card, Lanyard is the fallback
      if (!spotifyReady) renderSpotify(payload.data.spotify);
    } catch (err) {
      // keep the local pfp; just report offline once we have no answer at all
      if (!discordPill || discordPill.dataset.status === "loading") {
        applyStatus("offline", null);
      }
    }
  }

  refreshPresence();
  // keep the avatar, decoration and status in step with Discord
  window.setInterval(refreshPresence, 10000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshPresence();
  });
  window.addEventListener("focus", refreshPresence);

  /* ---------- discord server widget ---------- */

  const SERVER_INVITE = "sarcastic";
  const INVITE_API = `https://discord.com/api/v10/invites/${SERVER_INVITE}?with_counts=true`;

  const serverCard = document.getElementById("serverCard");
  const serverIcon = document.getElementById("serverIcon");
  const serverName = document.getElementById("serverName");
  const serverOnline = document.getElementById("serverOnline");
  const serverMembers = document.getElementById("serverMembers");

  async function refreshServer() {
    if (!serverOnline || !serverMembers) return;
    try {
      const res = await fetch(INVITE_API, { cache: "no-store" });
      if (!res.ok) throw new Error(`invite ${res.status}`);
      const data = await res.json();
      const guild = data.guild;
      if (!guild) return;

      // the join link follows the invite code, so a rename needs no edit
      if (serverCard) serverCard.href = `https://discord.gg/${data.code || SERVER_INVITE}`;
      if (guild.name && serverName) serverName.textContent = guild.name;
      if (guild.id && guild.icon && serverIcon) {
        serverIcon.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
      }
      if (typeof data.approximate_presence_count === "number") {
        serverOnline.textContent = data.approximate_presence_count.toLocaleString("en-US");
      }
      if (typeof data.approximate_member_count === "number") {
        serverMembers.textContent = data.approximate_member_count.toLocaleString("en-US");
      }
    } catch (err) {
      // offline / rate limited: keep the numbers already on the card
    }
  }

  refreshServer();
  window.setInterval(refreshServer, 30000);
  window.addEventListener("focus", refreshServer);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshServer();
  });

  /* ---------- hidden admin (alt + y, or hold the view count) ---------- */

  function setHint(text, isError) {
    if (!adminHint) return;
    adminHint.textContent = text;
    adminHint.classList.toggle("is-error", Boolean(isError));
  }

  function renderSongOptions() {
    if (!adminSongSelect) return;

    const wanted = adminSongSelect.value || state.songKey || "";
    const list = songs.length
      ? [...songs]
      : [{ id: "", name: "raininglol", builtin: true }];

    if (wanted && !list.some((item) => (item.id || "") === wanted)) {
      list.push({ id: wanted, name: state.songName || "current song" });
    }

    adminSongSelect.textContent = "";

    list.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id || "";
      option.textContent = item.builtin ? `${item.name} (default)` : item.name;
      adminSongSelect.appendChild(option);
    });

    adminSongSelect.value = list.some((item) => (item.id || "") === wanted)
      ? wanted
      : "";
  }

  async function loadSongs() {
    if (!adminSongSelect || songsLoading) return;

    songsLoading = true;

    try {
      const res = await fetch(`${API_BASE}/api/songs`, { cache: "no-store" });
      if (!res.ok) throw new Error(`songs ${res.status}`);

      const data = await res.json();
      songs = Array.isArray(data.songs) ? data.songs : [];
      renderSongOptions();
    } catch (err) {
      renderSongOptions();
    } finally {
      songsLoading = false;
    }
  }

  function renderBackgroundOptions() {
    if (!adminBackgroundSelect) return;

    const wanted = adminBackgroundSelect.value || state.backgroundKey || "";
    const list = backgrounds.slice();

    if (wanted && !list.some((item) => (item.id || "") === wanted)) {
      list.push({ id: wanted, name: state.backgroundName || "current background" });
    }

    adminBackgroundSelect.textContent = "";

    const fallback = document.createElement("option");
    fallback.value = "";
    fallback.textContent = "default";
    adminBackgroundSelect.appendChild(fallback);

    list.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id || "";
      option.textContent = `${item.name}${item.kind === "video" ? " · video" : ""}`;
      adminBackgroundSelect.appendChild(option);
    });

    adminBackgroundSelect.value = list.some((item) => (item.id || "") === wanted)
      ? wanted
      : "";
  }

  async function loadBackgrounds() {
    if (!adminBackgroundSelect || backgroundsLoading) return;

    backgroundsLoading = true;

    try {
      const res = await fetch(`${API_BASE}/api/backgrounds`, { cache: "no-store" });
      if (!res.ok) throw new Error(`backgrounds ${res.status}`);

      const data = await res.json();
      backgrounds = Array.isArray(data.backgrounds) ? data.backgrounds : [];
      renderBackgroundOptions();
    } catch (err) {
      renderBackgroundOptions();
    } finally {
      backgroundsLoading = false;
    }
  }

  function fillAdminFields() {
    if (adminHandleInput) adminHandleInput.value = handleEl ? handleEl.textContent : "";
    if (adminBioInput) adminBioInput.value = bioEl ? bioEl.textContent : "";
    if (adminLocationInput) adminLocationInput.value = locationEl ? locationEl.textContent : "";
    if (adminLastfmInput) adminLastfmInput.value = state.lastfm || "";
    if (adminViewsInput) adminViewsInput.value = String(state.views);

    if (adminSongSelect) {
      const wanted = state.songKey || "";
      const hasOption = Array.from(adminSongSelect.options).some(
        (option) => option.value === wanted
      );

      if (wanted && !hasOption) {
        const option = document.createElement("option");
        option.value = wanted;
        option.textContent = state.songName || "current song";
        adminSongSelect.appendChild(option);
      }

      adminSongSelect.value = wanted;
    }

    if (adminBackgroundSelect) {
      const wanted = state.backgroundKey || "";
      const hasOption = Array.from(adminBackgroundSelect.options).some(
        (option) => option.value === wanted
      );

      if (wanted && !hasOption) {
        const option = document.createElement("option");
        option.value = wanted;
        option.textContent = state.backgroundName || "current background";
        adminBackgroundSelect.appendChild(option);
      }

      adminBackgroundSelect.value = wanted;
    }
  }

  function revealProfileFields() {
    [
      adminHandleField,
      adminBioField,
      adminLocationField,
      adminLastfmField,
      adminSongField,
      adminSongUploadField,
      adminBackgroundField,
      adminBackgroundUploadField,
      adminViewsField,
      adminResetBtn,
    ].forEach((field) => {
      if (field) field.hidden = false;
    });
  }

  function openAdmin() {
    if (!adminEl || !adminKeyInput) return;
    adminEl.hidden = false;

    if (adminUnlocked) {
      fillAdminFields();
      Promise.all([loadSongs(), loadBackgrounds()]).then(fillAdminFields);
      adminHandleInput.focus();
      adminHandleInput.select();
      setHint("enter to save · esc to close", false);
    } else {
      adminKeyInput.value = "";
      adminKeyInput.focus();
      setHint("alt + y to close", false);
    }
  }

  function closeAdmin() {
    if (!adminEl) return;
    adminEl.hidden = true;
    if (adminKeyInput) adminKeyInput.value = "";
  }

  async function verifyKey(key) {
    const res = await fetch(`${API_BASE}/api/verify`, {
      method: "POST",
      headers: { "x-admin-key": key },
    });

    if (res.status === 401) return false;
    if (!res.ok) throw new Error(`verify ${res.status}`);
    return true;
  }

  async function saveProfile(payload) {
    const res = await fetch(`${API_BASE}/api/profile`, {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-key": adminSecret },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = new Error(`save ${res.status}`);
      error.status = res.status;
      throw error;
    }

    return res.json();
  }

  async function resetProfile() {
    const res = await fetch(`${API_BASE}/api/reset`, {
      method: "POST",
      headers: { "x-admin-key": adminSecret },
    });

    if (!res.ok) throw new Error(`reset ${res.status}`);

    return res.json();
  }

  function adoptServerProfile(data) {
    applyProfile(data);
    viewsLocked = true;
    views.textContent = formatViews(state.views);
    writeCache();
    fillAdminFields();
  }

  let resetArmed = false;
  let resetTimer = 0;

  function disarmReset() {
    resetArmed = false;
    window.clearTimeout(resetTimer);
    if (adminResetBtn) adminResetBtn.textContent = "reset";
  }

  if (adminResetBtn) {
    adminResetBtn.addEventListener("click", async () => {
      if (!resetArmed) {
        resetArmed = true;
        adminResetBtn.textContent = "confirm reset";
        setHint("click again to restore the defaults", true);
        resetTimer = window.setTimeout(disarmReset, 4000);
        return;
      }

      disarmReset();
      setHint("resetting…", false);

      try {
        const data = await resetProfile();
        adoptServerProfile(data);
        if (window.ZenBackground) window.ZenBackground.refresh();
        setHint("reset · esc to close", false);
      } catch (err) {
        setHint("couldn't reset — try again", true);
      }
    });
  }

  if (adminSongFile) {
    adminSongFile.addEventListener("change", async () => {
      const file = adminSongFile.files && adminSongFile.files[0];
      if (!file) return;

      if (file.size > 20 * 1024 * 1024) {
        setHint("song is too large — 20mb max", true);
        adminSongFile.value = "";
        return;
      }

      setHint("uploading song…", false);

      try {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch(`${API_BASE}/api/songs`, {
          method: "POST",
          headers: { "x-admin-key": adminSecret },
          body: form,
        });

        let data = null;
        try {
          data = await res.json();
        } catch (err) {
          data = null;
        }

        if (!res.ok || !data || !data.song) {
          const message =
            data && data.error === "file too large"
              ? "song is too large — 20mb max"
              : "couldn't upload that song";
          setHint(message, true);
          return;
        }

        if (Array.isArray(data.songs)) {
          songs = data.songs;
        } else {
          songs = songs.filter((item) => (item.id || "") !== data.song.id);
          songs.push(data.song);
        }

        renderSongOptions();
        if (adminSongSelect) adminSongSelect.value = data.song.id;
        setHint("uploaded · enter to switch", false);
      } catch (err) {
        setHint("couldn't upload that song", true);
      } finally {
        adminSongFile.value = "";
      }
    });
  }

  if (adminBackgroundFile) {
    adminBackgroundFile.addEventListener("change", async () => {
      const file = adminBackgroundFile.files && adminBackgroundFile.files[0];
      if (!file) return;

      if (file.size > 30 * 1024 * 1024) {
        setHint("background is too large — 30mb max", true);
        adminBackgroundFile.value = "";
        return;
      }

      setHint("uploading background…", false);

      try {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch(`${API_BASE}/api/backgrounds`, {
          method: "POST",
          headers: { "x-admin-key": adminSecret },
          body: form,
        });

        let data = null;
        try {
          data = await res.json();
        } catch (err) {
          data = null;
        }

        if (!res.ok || !data || !data.background) {
          const message =
            data && data.error === "file too large"
              ? "background is too large — 30mb max"
              : "couldn't upload that background";
          setHint(message, true);
          return;
        }

        if (Array.isArray(data.backgrounds)) {
          backgrounds = data.backgrounds;
        } else {
          backgrounds = backgrounds.filter(
            (item) => (item.id || "") !== data.background.id
          );
          backgrounds.push(data.background);
        }

        renderBackgroundOptions();
        if (adminBackgroundSelect) adminBackgroundSelect.value = data.background.id;
        setHint("uploaded · enter to apply", false);
      } catch (err) {
        setHint("couldn't upload that background", true);
      } finally {
        adminBackgroundFile.value = "";
      }
    });
  }

  if (adminForm) {
    adminForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!adminUnlocked) {
        const key = adminKeyInput.value.trim();

        if (!key) {
          setHint("enter the key", true);
          return;
        }

        setHint("checking…", false);

        try {
          const ok = await verifyKey(key);

          if (!ok) {
            adminKeyInput.value = "";
            adminKeyInput.focus();
            setHint("wrong key", true);
            return;
          }

          adminSecret = key;
          adminUnlocked = true;
          adminKeyField.hidden = true;
          revealProfileFields();
          fillAdminFields();
          Promise.all([loadSongs(), loadBackgrounds()]).then(fillAdminFields);
          adminHandleInput.focus();
          adminHandleInput.select();
          setHint("enter to save · esc to close", false);
        } catch (err) {
          setHint("couldn't reach the server", true);
        }
        return;
      }

      const nextViews = Math.max(0, Math.floor(Number(adminViewsInput.value)));
      if (!Number.isFinite(nextViews)) return;

      const payload = {
        handle: adminHandleInput.value.trim() || state.handle,
        bio: adminBioInput.value.trim(),
        location: adminLocationInput.value.trim() || state.location,
        lastfm: adminLastfmInput ? adminLastfmInput.value.trim().toLowerCase() : "",
        song: adminSongSelect ? adminSongSelect.value : state.songKey || "",
        background: adminBackgroundSelect
          ? adminBackgroundSelect.value
          : state.backgroundKey || "",
        views: nextViews,
      };

      setHint("saving…", false);

      try {
        const data = await saveProfile(payload);
        adoptServerProfile(data);
        if (window.ZenBackground) window.ZenBackground.refresh();
        setHint("saved · esc to close", false);
      } catch (err) {
        if (err.status === 401) setHint("wrong key", true);
        else setHint("couldn't save — try again", true);
      }
    });
  }

  if (adminEl) {
    adminEl.addEventListener("click", (e) => {
      if (e.target === adminEl) closeAdmin();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "y" || e.key === "Y" || e.code === "KeyY")) {
      e.preventDefault();
      if (adminEl && !adminEl.hidden) closeAdmin();
      else openAdmin();
      return;
    }

    if (e.key === "Escape" && adminEl && !adminEl.hidden) closeAdmin();
  });

  // no Alt key on a phone: hold the view count for a moment instead
  const viewsStat = document.querySelector(".views");
  let pressTimer = 0;
  let pressOrigin = null;

  function cancelLongPress() {
    window.clearTimeout(pressTimer);
    pressTimer = 0;
    pressOrigin = null;
  }

  if (viewsStat) {
    viewsStat.addEventListener("pointerdown", (e) => {
      pressOrigin = { x: e.clientX, y: e.clientY };
      window.clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => {
        pressOrigin = null;
        pressTimer = 0;
        openAdmin();
      }, 650);
    });

    viewsStat.addEventListener("pointermove", (e) => {
      if (!pressOrigin) return;
      if (Math.hypot(e.clientX - pressOrigin.x, e.clientY - pressOrigin.y) > 10) {
        cancelLongPress();
      }
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => {
      viewsStat.addEventListener(ev, cancelLongPress);
    });

    viewsStat.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* ---------- card visibility ---------- */

  const CARD_STORE = "zen.cards";
  const cardPanels = {
    profile: card,
    server: document.getElementById("serverCard"),
    spotify: document.getElementById("spotifyCard"),
  };
  const cardToggles = Array.from(document.querySelectorAll("[data-toggle]"));
  const hiddenPanels = new Set();

  try {
    const saved = JSON.parse(localStorage.getItem(CARD_STORE) || "{}");
    Object.keys(cardPanels).forEach((key) => {
      if (saved[key] === false) hiddenPanels.add(key);
    });
  } catch (err) {
    // no saved choice yet
  }

  function applyCardVisibility() {
    const snapshot = {};

    Object.keys(cardPanels).forEach((key) => {
      const el = cardPanels[key];
      const shown = !hiddenPanels.has(key);
      snapshot[key] = shown;
      if (!el) return;

      el.classList.toggle("is-hidden", !shown);
      if (!shown) {
        // drop any leftover tilt so it comes back level
        el.style.removeProperty("transform");
        el.classList.remove("is-tilting");
      }
    });

    cardToggles.forEach((btn) => {
      const on = !hiddenPanels.has(btn.dataset.toggle);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });

    try {
      localStorage.setItem(CARD_STORE, JSON.stringify(snapshot));
    } catch (err) {
      // storage can be blocked; the page still works for this visit
    }
  }

  cardToggles.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.toggle;
      if (!key || !cardPanels[key]) return;

      if (hiddenPanels.has(key)) hiddenPanels.delete(key);
      else hiddenPanels.add(key);

      applyCardVisibility();
    });
  });

  applyCardVisibility();

  /* ---------- 3d tilt (each card tilts on its own) ---------- */

  // the profile card gets a little more travel than the two flat cards, and the
  // transform is written inline so the reveal animation's transform can't win
  const tiltCards = [
    { el: card, max: 9, depth: 1100 },
    { el: cardPanels.server, max: 6, depth: 800 },
    { el: cardPanels.spotify, max: 6, depth: 800 },
  ].filter((item) => item.el);

  const canTilt =
    tiltCards.length > 0 &&
    !reducedMotion &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (canTilt) {
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    tiltCards.forEach(({ el, max, depth }) => {
      const cur = { x: 0, y: 0 };
      const tgt = { x: 0, y: 0 };
      let active = false;
      let raf = 0;

      const paint = () => {
        el.style.transform =
          `perspective(${depth}px) ` +
          `rotateX(${cur.x.toFixed(2)}deg) rotateY(${cur.y.toFixed(2)}deg)`;
      };

      function frame() {
        cur.x += (tgt.x - cur.x) * 0.14;
        cur.y += (tgt.y - cur.y) * 0.14;
        const settled = Math.abs(tgt.x - cur.x) < 0.02 && Math.abs(tgt.y - cur.y) < 0.02;

        paint();

        if (!settled) {
          raf = requestAnimationFrame(frame);
          return;
        }

        raf = 0;
        if (!active) el.classList.remove("is-tilting");
      }

      function run() {
        if (!raf) raf = requestAnimationFrame(frame);
      }

      el.addEventListener(
        "pointermove",
        (e) => {
          const rect = el.getBoundingClientRect();
          if (!rect.width || !rect.height) return;

          const px = clamp((e.clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
          const py = clamp((e.clientY - rect.top) / rect.height, 0, 1) * 2 - 1;

          tgt.y = px * max;
          tgt.x = -py * max * 0.7;

          if (!active) {
            active = true;
            el.classList.add("is-tilting");
          }

          run();
        },
        { passive: true }
      );

      const reset = () => {
        tgt.x = 0;
        tgt.y = 0;
        active = false;
        run();
      };

      el.addEventListener("pointerleave", reset);
      el.addEventListener("pointercancel", reset);
      window.addEventListener("blur", reset);
    });
  }
})();
