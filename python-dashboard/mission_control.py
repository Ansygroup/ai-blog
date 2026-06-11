import customtkinter as ctk
import threading
import webbrowser
import json
import os
import tkinter as tk
from datetime import datetime
from config import AGENTS, CATEGORIES, REFRESH_INTERVAL_MS
from github_api import fetch_agent_statuses, trigger_workflow, time_ago

GEO_FILE = os.path.join(os.path.expanduser("~"), ".mission-control-geo.json")


class MissionControlApp(ctk.CTk):
    def __init__(self, token, repo):
        super().__init__()
        self.token = token
        self.repo = repo
        self.agents_data = []
        self.system_data = {"totalRuns": 0, "successRuns": 0, "failRuns": 0, "inProgress": 0, "uptime": 100}
        self.running_agents = set()
        self.error = None
        self.search_query = ""
        self._refresh_timer = None
        self._fetching = False
        self.status_filter = "all"
        self.view_mode = "grid"

        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("green")

        self.title("Mission Control \u2014 AI Agent Fleet")
        self._load_geometry()
        self.minsize(1024, 650)

        self._build_ui()
        self._bind_shortcuts()
        self.after(500, self._initial_fetch)

    def _load_geometry(self):
        try:
            with open(GEO_FILE) as f:
                d = json.load(f)
                self.geometry(f"{d['w']}x{d['h']}+{d['x']}+{d['y']}")
                return
        except Exception:
            pass
        self.geometry("1280x820")

    def _save_geometry(self):
        try:
            x, y = self.winfo_x(), self.winfo_y()
            w, h = self.winfo_width(), self.winfo_height()
            with open(GEO_FILE, "w") as f:
                json.dump({"x": x, "y": y, "w": w, "h": h}, f)
        except Exception:
            pass

    def _bind_shortcuts(self):
        self.bind("<Control-r>", lambda e: self._refresh())
        self.bind("<Control-f>", lambda e: self.search_entry.focus())
        self.bind("<Control-F>", lambda e: self.search_entry.focus())
        self.bind("<Escape>", lambda e: (self.search_var.set(""), self.focus()))
        self.bind("<Control-c>", lambda e: self._copy_status())
        self.bind("<Control-C>", lambda e: self._copy_status())
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _on_close(self):
        self._save_geometry()
        self.destroy()

    def _build_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(4, weight=1)

        ROW = 0
        # ── Header ──
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=ROW, column=0, sticky="ew", padx=24, pady=(16, 4))
        header.grid_columnconfigure(0, weight=1)
        ROW += 1

        title_frame = ctk.CTkFrame(header, fg_color="transparent")
        title_frame.grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(title_frame, text="\U0001f5a5\ufe0f  Mission Control",
                      font=ctk.CTkFont(size=24, weight="bold")).pack(anchor="w")

        sub_frame = ctk.CTkFrame(title_frame, fg_color="transparent")
        sub_frame.pack(anchor="w")
        self.status_label = ctk.CTkLabel(sub_frame, text=f"AI Agent Fleet \u00b7 {len(AGENTS)} agents",
                                         font=ctk.CTkFont(size=13), text_color="#94A3B8")
        self.status_label.pack(side="left")
        ctk.CTkLabel(sub_frame, text="  \u00b7  Ctrl+R refresh  \u00b7  Ctrl+F search  \u00b7  Ctrl+C copy",
                      font=ctk.CTkFont(size=11), text_color="#475569").pack(side="left", padx=6)

        self.refresh_btn = ctk.CTkButton(header, text="\u27f3 Refresh", command=self._refresh,
                                         width=100, height=34, font=ctk.CTkFont(size=13))
        self.refresh_btn.grid(row=0, column=1, sticky="e")

        # ── Search bar + view toggle ──
        search_frame = ctk.CTkFrame(self, fg_color="transparent")
        search_frame.grid(row=ROW, column=0, sticky="ew", padx=24, pady=(4, 6))
        search_frame.grid_columnconfigure(0, weight=1)
        ROW += 1

        self.search_var = ctk.StringVar()
        self.search_var.trace_add("write", self._on_search)
        self.search_entry = ctk.CTkEntry(search_frame, textvariable=self.search_var,
                                          placeholder_text="\U0001f50d  Search agents by name, category, description...",
                                          height=36, font=ctk.CTkFont(size=13))
        self.search_entry.grid(row=0, column=0, sticky="ew", padx=(0, 6))

        self.filter_count = ctk.CTkLabel(search_frame, text=f"{len(AGENTS)}/{len(AGENTS)}",
                                         font=ctk.CTkFont(size=13), text_color="#64748B", width=56)
        self.filter_count.grid(row=0, column=1, padx=(0, 6))

        view_btn = ctk.CTkButton(search_frame, text="\u2630", width=36, height=36, corner_radius=6,
                                 fg_color="#1E293B", hover_color="#334155",
                                 command=self._toggle_view)
        view_btn.grid(row=0, column=2, padx=(0, 0))

        # ── Status filter pills ──
        filter_frame = ctk.CTkFrame(self, fg_color="transparent")
        filter_frame.grid(row=ROW, column=0, sticky="ew", padx=24, pady=(0, 8))
        ROW += 1

        self.filter_btns = {}
        for i, (key, label, color) in enumerate([
            ("all", "All", "#64748B"),
            ("in_progress", "Running", "#3B82F6"),
            ("failure", "Failed", "#EF4444"),
            ("success", "Success", "#22C55E"),
        ]):
            btn = ctk.CTkButton(filter_frame, text=label, width=80, height=28,
                                font=ctk.CTkFont(size=12), corner_radius=14,
                                fg_color="#1E293B" if key != "all" else "#334155",
                                hover_color="#475569",
                                text_color=color,
                                command=lambda k=key: self._set_status_filter(k))
            btn.grid(row=0, column=i, padx=3)
            self.filter_btns[key] = btn

        self._update_filter_buttons()

        # ── Health cards ──
        self.health_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.health_frame.grid(row=ROW, column=0, sticky="ew", padx=24, pady=(2, 12))
        for i in range(4):
            self.health_frame.grid_columnconfigure(i, weight=1, uniform="health")
        ROW += 1

        self.health_cards = []
        for label, value, color, sub in [
            ("System Uptime", "100%", "#22C55E", "No runs yet"),
            ("Successful Runs", "0", "#22C55E", "0% success rate"),
            ("Failed Runs", "0", "#EF4444", "All clear"),
            ("In Progress", "0", "#3B82F6", "All idle"),
        ]:
            card = self._make_health_card(self.health_frame, label, value, color, sub)
            card.grid(row=0, column=len(self.health_cards), padx=5, sticky="ew")
            self.health_cards.append(card)

        # ── Scrollable agent area ──
        self.scroll_frame = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.scroll_frame.grid(row=ROW, column=0, sticky="nsew", padx=24, pady=(0, 8))
        ROW += 1

        self.loading_indicator = ctk.CTkLabel(self.scroll_frame, text="",
                                              font=ctk.CTkFont(size=16), text_color="#64748B")
        self.error_label = ctk.CTkLabel(self.scroll_frame, text="",
                                        font=ctk.CTkFont(size=14), text_color="#EF4444")

        # ── Status bar ──
        status_bar = ctk.CTkFrame(self, fg_color="#0A0F1A", height=28, corner_radius=0)
        status_bar.grid(row=ROW, column=0, sticky="ew")
        status_bar.grid_columnconfigure(0, weight=1)
        status_bar.grid_propagate(False)

        self.bar_left = ctk.CTkLabel(status_bar, text="Ready",
                                     font=ctk.CTkFont(size=11), text_color="#64748B")
        self.bar_left.pack(side="left", padx=16)

        copy_btn = ctk.CTkButton(status_bar, text="\u2398 Copy", width=70, height=22,
                                 font=ctk.CTkFont(size=10), corner_radius=4,
                                 fg_color="#1E293B", hover_color="#334155", text_color="#64748B",
                                 command=self._copy_status)
        copy_btn.pack(side="right", padx=4)

        self.bar_right = ctk.CTkLabel(status_bar, text="",
                                      font=ctk.CTkFont(size=11), text_color="#64748B")
        self.bar_right.pack(side="right", padx=4)

    # ── View toggle ──
    def _toggle_view(self):
        self.view_mode = "list" if self.view_mode == "grid" else "grid"
        self._render_agents()

    # ── Status filter ──
    def _set_status_filter(self, key):
        self.status_filter = key
        self._update_filter_buttons()
        self._render_agents()

    def _update_filter_buttons(self):
        active_bg = "#1E3A5F"
        active_hover = "#1E3A5F"
        inactive_bg = "#1E293B"
        for key, btn in self.filter_btns.items():
            is_active = key == self.status_filter
            btn.configure(fg_color=active_bg if is_active else inactive_bg,
                          hover_color=active_hover if is_active else "#475569")

    # ── Health card factory ──
    def _make_health_card(self, parent, label, value, color, sub):
        card = ctk.CTkFrame(parent, corner_radius=10, border_width=1,
                            border_color="#334155", fg_color="#1E293B")
        card.grid_columnconfigure(0, weight=1)
        hr = ctk.CTkFrame(card, fg_color="transparent")
        hr.grid(row=0, column=0, sticky="ew", padx=14, pady=(12, 0))
        hr.grid_columnconfigure(1, weight=1)
        ctk.CTkLabel(hr, text="\u25cf", font=ctk.CTkFont(size=10), text_color=color
                     ).grid(row=0, column=0, padx=(0, 6))
        ctk.CTkLabel(hr, text=label, font=ctk.CTkFont(size=11), text_color="#94A3B8"
                     ).grid(row=0, column=1, sticky="w")
        val_lbl = ctk.CTkLabel(card, text=value, font=ctk.CTkFont(size=24, weight="bold"), text_color=color)
        val_lbl.grid(row=1, column=0, sticky="w", padx=14, pady=(4, 0))
        sub_lbl = ctk.CTkLabel(card, text=sub, font=ctk.CTkFont(size=11), text_color="#64748B")
        sub_lbl.grid(row=2, column=0, sticky="w", padx=14, pady=(0, 12))
        card.value_label = val_lbl
        card.sub_label = sub_lbl
        return card

    # ── Search handler ──
    def _on_search(self, *_):
        self.search_query = self.search_var.get().strip().lower()
        self._render_agents()

    # ── Data fetching ──
    def _initial_fetch(self):
        self._fetch_data(show_loading=True)

    def _refresh(self):
        if self._refresh_timer:
            self.after_cancel(self._refresh_timer)
            self._refresh_timer = None
        self._fetch_data(show_loading=False)

    def _fetch_data(self, show_loading=False):
        if self._fetching:
            return
        self._fetching = True
        self.refresh_btn.configure(state="disabled", text="\u27f3 Refreshing...")
        if show_loading:
            self.loading_indicator.configure(text="\u23f3  Loading agent data...")
            self.loading_indicator.pack(pady=40)
        self.bar_left.configure(text="\u27f3 Refreshing...")
        threading.Thread(target=self._fetch_worker, daemon=True).start()

    def _fetch_worker(self):
        result = fetch_agent_statuses(self.token, self.repo, AGENTS)
        self.after(0, lambda: self._handle_fetch_result(result))

    def _handle_fetch_result(self, result):
        self._fetching = False
        self.loading_indicator.pack_forget()
        self.refresh_btn.configure(state="normal", text="\u27f3 Refresh")

        self.error = result.get("error")
        if self.error:
            WARN = "\u26a0"
            self.error_label.configure(text=f"{WARN}  {self.error}")
            self.error_label.pack(pady=10)
            self.bar_left.configure(text=f"{WARN} Error fetching data")
            return

        self.error_label.pack_forget()
        self.agents_data = result["agents"]
        self.system_data = result["system"]
        self._update_health_cards()
        self._render_agents()

        now_str = datetime.now().strftime("%H:%M:%S")
        s = self.system_data
        total = s.get("totalRuns", 0)
        running = s.get("inProgress", 0)
        BULLET = "\u2022"
        DOT = "\u25cf"
        self.bar_left.configure(
            text=f"{BULLET} {len(self.agents_data)} agents  {BULLET} {total} total runs  {BULLET} Updated {now_str}"
        )
        self.bar_right.configure(
            text=f"{DOT} {running} running" if running else "All idle"
        )
        self._schedule_refresh()

    def _schedule_refresh(self):
        if self._refresh_timer:
            self.after_cancel(self._refresh_timer)
        self._refresh_timer = self.after(REFRESH_INTERVAL_MS, self._refresh)

    # ── Health cards update ──
    def _update_health_cards(self):
        s = self.system_data
        uptime = s.get("uptime", 100)
        total = s.get("totalRuns", 0)
        success = s.get("successRuns", 0)
        failed = s.get("failRuns", 0)
        progress = s.get("inProgress", 0)
        uc = "#22C55E" if uptime >= 80 else ("#F97316" if uptime >= 60 else "#EF4444")
        configs = [
            (f"{uptime}%", uc, f"Last {total} runs"),
            (str(success), "#22C55E", f"{round(success / total * 100) if total else 0}% success rate"),
            (str(failed), "#EF4444" if failed > 0 else "#64748B",
             "Requires attention" if failed > 0 else "All clear"),
            (str(progress), "#3B82F6", "Running now" if progress > 0 else "All idle"),
        ]
        for i, (val, color, sub) in enumerate(configs):
            self.health_cards[i].value_label.configure(text=val, text_color=color)
            self.health_cards[i].sub_label.configure(text=sub)

    # ── Render agent cards ──
    def _render_agents(self):
        for widget in self.scroll_frame.winfo_children():
            if widget not in (self.loading_indicator, self.error_label):
                widget.destroy()

        query = self.search_query
        filtered = self.agents_data
        if query:
            filtered = [a for a in self.agents_data
                        if query in a.get("name", "").lower()
                        or query in a.get("desc", "").lower()
                        or query in a.get("category", "").lower()
                        or query in a.get("id", "").lower()]

        sf = self.status_filter
        if sf == "in_progress":
            filtered = [a for a in filtered if a.get("status") == "in_progress"]
        elif sf == "failure":
            filtered = [a for a in filtered if a.get("conclusion") == "failure"]
        elif sf == "success":
            filtered = [a for a in filtered if a.get("conclusion") == "success"]

        total_shown = len(filtered)
        total_all = len(self.agents_data)
        self.filter_count.configure(text=f"{total_shown}/{total_all}")

        if not filtered:
            ctk.CTkLabel(self.scroll_frame, text="\U0001f50d  No agents match your filter",
                         font=ctk.CTkFont(size=16), text_color="#64748B").pack(pady=60)
            return

        is_grid = self.view_mode == "grid"
        ncols = 2 if is_grid else 1

        row = 0
        for cat in CATEGORIES:
            cat_agents = [a for a in filtered if a.get("category") == cat["id"]]
            if not cat_agents:
                continue
            running_count = sum(1 for a in cat_agents if a.get("status") == "in_progress")

            cat_header = ctk.CTkFrame(self.scroll_frame, fg_color="transparent")
            cat_header.grid(row=row, column=0, sticky="ew", pady=(14, 6))
            cat_header.grid_columnconfigure(0, weight=1)

            hdr = ctk.CTkFrame(cat_header, fg_color="transparent")
            hdr.grid(row=0, column=0, sticky="w")
            ctk.CTkLabel(hdr, text=cat["label"], font=ctk.CTkFont(size=18, weight="bold"),
                         text_color="#E2E8F0").pack(side="left")
            if running_count:
                ctk.CTkLabel(hdr, text=f"  {running_count} running  ",
                             font=ctk.CTkFont(size=12), text_color="#60A5FA",
                             fg_color="#1E3A5F", corner_radius=4, padx=6).pack(side="left", padx=8)

            run_all_btn = ctk.CTkButton(hdr, text="\u25b6 Run All", width=80, height=26,
                                        font=ctk.CTkFont(size=11), corner_radius=6,
                                        fg_color="#1E293B", hover_color="#22C55E", text_color="#94A3B8",
                                        command=lambda agents=cat_agents: self._run_agents(agents))
            run_all_btn.pack(side="left", padx=12)
            ctk.CTkLabel(hdr, text=f"({len(cat_agents)})",
                         font=ctk.CTkFont(size=12), text_color="#64748B").pack(side="left")

            row += 1

            card_frame = ctk.CTkFrame(self.scroll_frame, fg_color="transparent")
            card_frame.grid(row=row, column=0, sticky="ew")
            for c in range(ncols):
                card_frame.grid_columnconfigure(c, weight=1)

            for i, agent in enumerate(cat_agents):
                col = i % ncols
                r = i // ncols
                self._make_agent_card(card_frame, agent).grid(
                    row=r, column=col, padx=5 if is_grid else 0, pady=4, sticky="ew"
                )

            row += 1

        self.scroll_frame.grid_rowconfigure(row, weight=1)

    # ── Agent card factory ──
    def _make_agent_card(self, parent, agent):
        conclusion = agent.get("conclusion") or agent.get("status", "unknown")
        is_running = agent.get("status") == "in_progress"
        is_failed = conclusion == "failure"
        is_completed = conclusion == "success"

        if is_running:
            border_color = "#3B82F6"
            sdot = "#3B82F6"
            stxt = "in_progress"
        elif is_failed:
            border_color = "#7F1D1D"
            sdot = "#EF4444"
            stxt = "failure"
        elif is_completed:
            border_color = "#1E3A5F"
            sdot = "#22C55E"
            stxt = "success"
        else:
            border_color = "#1E3A5F"
            sdot = "#64748B"
            stxt = conclusion or "unknown"

        card = ctk.CTkFrame(parent, corner_radius=10, border_width=1,
                            border_color=border_color, fg_color="#0F172A")
        card.grid_columnconfigure(0, weight=1)

        inner = ctk.CTkFrame(card, fg_color="transparent")
        inner.grid(row=0, column=0, sticky="ew", padx=14, pady=12)
        inner.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(inner, text=agent.get("emoji", "\U0001f916"),
                     font=ctk.CTkFont(size=22)
                     ).grid(row=0, column=0, rowspan=3, padx=(0, 12), sticky="n")

        nf = ctk.CTkFrame(inner, fg_color="transparent")
        nf.grid(row=0, column=1, sticky="w")
        ctk.CTkLabel(nf, text=agent.get("name", ""),
                     font=ctk.CTkFont(size=14, weight="bold"), text_color="#E2E8F0"
                     ).pack(side="left")
        if agent.get("tier") == "core":
            ctk.CTkLabel(nf, text=" CORE ", font=ctk.CTkFont(size=10, weight="bold"),
                         text_color="#22C55E", fg_color="#052E16",
                         corner_radius=3, padx=5, pady=1
                         ).pack(side="left", padx=6)

        STOPWATCH = "\u23f1"
        ctk.CTkLabel(inner, text=agent.get("desc", ""),
                     font=ctk.CTkFont(size=12), text_color="#94A3B8",
                     wraplength=380, justify="left"
                     ).grid(row=1, column=1, sticky="w", pady=(2, 4))

        meta = ctk.CTkFrame(inner, fg_color="transparent")
        meta.grid(row=2, column=1, sticky="w")
        ctk.CTkLabel(meta, text=f"{STOPWATCH} {agent.get('schedule', '')}",
                     font=ctk.CTkFont(size=11), text_color="#64748B").pack(side="left")
        ctk.CTkLabel(meta, text="  \u00b7  ", font=ctk.CTkFont(size=11),
                     text_color="#334155").pack(side="left")
        ctk.CTkLabel(meta, text="\u25cf", font=ctk.CTkFont(size=9),
                     text_color=sdot).pack(side="left")
        ctk.CTkLabel(meta, text=f" {stxt}", font=ctk.CTkFont(size=11),
                     text_color="#94A3B8").pack(side="left")
        if agent.get("lastRun"):
            ctk.CTkLabel(meta, text=f"  \u00b7  {time_ago(agent['lastRun'])}",
                         font=ctk.CTkFont(size=11), text_color="#64748B").pack(side="left")

        actions = ctk.CTkFrame(inner, fg_color="transparent")
        actions.grid(row=0, column=2, rowspan=3, sticky="ne")

        if agent.get("runUrl"):
            ctk.CTkButton(actions, text="\U0001f517", width=32, height=32, corner_radius=6,
                          fg_color="#1E293B", hover_color="#334155",
                          command=lambda url=agent["runUrl"]: webbrowser.open(url)
                          ).pack(side="left", padx=1)

        agent_id = agent.get("id", "")
        is_this_running = agent_id in self.running_agents
        rbtn = ctk.CTkButton(actions,
                             text="\u25b6" if not is_this_running else "\u27f3",
                             width=32, height=32, corner_radius=6,
                             fg_color="#1E293B", hover_color="#22C55E",
                             state="disabled" if is_running else "normal",
                             command=lambda a=agent: self._run_agent(a))
        rbtn.pack(side="left", padx=1)
        agent["_run_btn"] = rbtn
        return card

    # ── Run agent ──
    def _run_agent(self, agent):
        agent_id = agent.get("id", "")
        self.running_agents.add(agent_id)
        btn = agent.get("_run_btn")
        if btn:
            btn.configure(text="\u27f3", state="disabled")
        PLAY = "\u25b6"
        self.bar_left.configure(text=f"{PLAY} Triggering {agent.get('name')}...")
        threading.Thread(target=self._run_worker, args=(agent,), daemon=True).start()

    def _run_agents(self, agents):
        for agent in agents:
            self._run_agent(agent)

    def _run_worker(self, agent):
        result = trigger_workflow(self.token, self.repo, agent.get("workflow", ""))
        self.after(0, lambda: self._handle_run_result(agent, result))

    def _handle_run_result(self, agent, result):
        agent_id = agent.get("id", "")
        self.running_agents.discard(agent_id)
        btn = agent.get("_run_btn")
        if btn:
            btn.configure(text="\u25b6", state="normal")
        if result.get("error"):
            self._show_error(f"Failed to run {agent.get('name')}: {result['error']}")
        else:
            CHECK = "\u2705"; DASH = "\u2014"
            self.bar_left.configure(text=f"{CHECK} Triggered {agent.get('name')} {DASH} refreshing...")
            self.after(3000, self._refresh)

    def _show_error(self, msg):
        WARN = "\u26a0"
        self.error_label.configure(text=f"{WARN}  {msg}")
        self.error_label.pack(pady=10)
        self.bar_left.configure(text=f"{WARN} {msg}")
        self.after(6000, lambda: self.error_label.pack_forget())

    # ── Copy status ──
    def _copy_status(self):
        if not self.agents_data:
            return
        lines = []
        lines.append("Mission Control \u2014 AI Agent Fleet Status")
        lines.append(f"Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        s = self.system_data
        lines.append(f"System: {s.get('uptime', '?')}% uptime | "
                     f"{s.get('successRuns', 0)} success / {s.get('failRuns', 0)} fail / "
                     f"{s.get('inProgress', 0)} in progress")
        lines.append("")
        for cat in CATEGORIES:
            cat_agents = [a for a in self.agents_data if a.get("category") == cat["id"]]
            if not cat_agents:
                continue
            lines.append(f"[{cat['label']}]")
            for a in cat_agents:
                status = a.get("conclusion") or a.get("status", "?")
                last = time_ago(a.get("lastRun", ""))
                lines.append(f"  {a.get('emoji', '')} {a.get('name', '')} \u2014 {status} \u2014 {last}")
            lines.append("")
        text = "\n".join(lines)
        self.clipboard_clear()
        self.clipboard_append(text)
        self.bar_left.configure(text="\u2705 Status copied to clipboard")


def run_dashboard(token, repo):
    app = MissionControlApp(token, repo)
    app.mainloop()
