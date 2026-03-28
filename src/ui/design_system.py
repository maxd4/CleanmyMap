import streamlit as st

def inject_base_css():
    """Injects the core Apple-style premium design system CSS."""
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@400;500&display=swap');
        
        :root {
            --primary: #10b981;
            --secondary: #3b82f6;
            --primary-soft: rgba(16, 185, 129, 0.1);
            --bg-glass: rgba(255, 255, 255, 0.03);
            --border-glass: rgba(128, 128, 128, 0.15);
            --text-main: #f8fafc;
            --text-soft: #94a3b8;
        }

        @media (prefers-color-scheme: light) {
            :root {
                --bg-glass: rgba(255, 255, 255, 0.7);
                --border-glass: rgba(0, 0, 0, 0.08);
                --text-main: #0f172a;
                --text-soft: #475569;
            }
        }

        /* Base Styling */
        html, body, [class*="css"] {
            font-family: 'Outfit', sans-serif !important;
        }
        
        .stApp {
            background: radial-gradient(circle at top right, rgba(16,185,129,0.05), transparent 400px),
                        radial-gradient(circle at bottom left, rgba(59,130,246,0.05), transparent 400px);
        }

        header, [data-testid="stHeader"] {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            display: none !important;
        }
        footer {
            display: none !important;
        }

        /* Premium Glass Cards */
        .premium-card {
            background: var(--bg-glass);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border-glass);
            border-radius: 28px;
            padding: 32px;
            margin-bottom: 24px;
            transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
        }

        .premium-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary);
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
        }

        /* Impact Metrics */
        .metric-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 20px;
            background: rgba(128, 128, 128, 0.05);
            border-radius: 20px;
            border: 1px solid transparent;
            transition: all 0.3s ease;
        }

        .metric-container:hover {
            background: var(--primary-soft);
            border-color: var(--primary);
        }

        .metric-value {
            font-size: 2.2rem;
            font-weight: 800;
            color: var(--primary);
            line-height: 1;
            margin-bottom: 8px;
        }

        /* --- WORLD CLASS LANDING ANIMATIONS --- */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0px); }
        }
        @keyframes glow {
            0% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.2); }
            50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); }
            100% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.2); }
        }

        .animate-in { animation: fadeInUp 0.8s ease-out forwards; }
        .floating { animation: float 4s ease-in-out infinite; }
        
        .hero-container {
            text-align: center;
            padding: 80px 20px;
            background: radial-gradient(circle at center, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
            border-radius: 40px;
            margin-bottom: 40px;
        }
        
        .hero-title {
            font-size: 4.5rem !important;
            font-weight: 900 !important;
            background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -2px;
            line-height: 1.1;
            margin-bottom: 24px;
        }
        
        .hero-subtitle {
            font-size: 1.4rem !important;
            color: #64748b;
            max-width: 700px;
            margin: 0 auto 40px auto;
            line-height: 1.6;
        }

        .feature-card {
            padding: 40px;
            border-radius: 30px;
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            cursor: pointer;
        }
        
        .feature-card:hover {
            transform: translateY(-10px) scale(1.02);
            background: white;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        /* Dark Mode Emeraude Overlay for Stats */
        .stat-glow {
            border: 1px solid rgba(16, 185, 129, 0.2);
            animation: glow 3s infinite;
        }
        
        /* Parallax effect placeholders */
        .parallax-bg {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: -1;
            overflow: hidden;
        }
        
        .metric-label {
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--text-soft);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Hero Styling */
        .hero-title {
            font-size: 4.5rem !important;
            font-weight: 800 !important;
            letter-spacing: -0.05em !important;
            background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 24px !important;
            line-height: 1.1 !important;
        }

        .badge-card {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            background: var(--primary-soft);
            border: 1px solid var(--primary);
            border-radius: 100px;
            color: var(--primary);
            font-weight: 700;
            font-size: 1.1rem;
            margin-top: 10px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        
        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .animate-in {
            animation: fadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        /* Custom Streamlit Overrides */
        .stTabs [data-baseweb="tab-list"] {
            gap: 8px;
            background-color: transparent !important;
        }

        .stTabs [data-baseweb="tab"] {
            height: 45px;
            white-space: pre-wrap;
            background-color: var(--bg-glass) !important;
            border-radius: 12px !important;
            border: 1px solid var(--border-glass) !important;
            padding: 0 20px !important;
            transition: all 0.3s ease !important;
        }

        .stTabs [aria-selected="true"] {
            color: var(--primary) !important;
            border-color: var(--primary) !important;
            background: var(--primary-soft) !important;
        }

        /* Metric Cards */
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }

        .metric-card {
            background: var(--bg-glass);
            padding: 24px;
            border-radius: 20px;
            border: 1px solid var(--border-glass);
            text-align: left;
        }

        .metric-label {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-soft);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }

        .metric-value {
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--primary);
        }

        .metric-unit {
            font-size: 1rem;
            color: var(--text-soft);
            font-weight: 400;
            margin-left: 4px;
        }

        /* Form Overhaul */
        .stForm {
            border: 1px solid var(--border-glass) !important;
            background: var(--bg-glass) !important;
            backdrop-filter: blur(12px);
            border-radius: 28px !important;
            padding: 40px !important;
        }

        /* Callouts styling */
        div[data-testid="stNotification"] {
            border-radius: 16px !important;
            border: 1px solid var(--border-glass) !important;
            background-color: var(--bg-glass) !important;
        }

        /* Progress bar styling */
        .stProgress div[role="progressbar"] > div {
            background: linear-gradient(90deg, #10b981, #34d399) !important;
            border-radius: 999px !important;
        }

        /* Sidebar Styling */
        section[data-testid="stSidebar"] {
            border-right: 1px solid var(--border-glass) !important;
        }

        /* Custom Buttons */
        .stButton > button {
            background: var(--primary) !important;
            color: white !important;
            border-radius: 14px !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            border: none !important;
            transition: all 0.3s !important;
        }

        .stButton > button:hover {
            opacity: 0.9;
            transform: scale(1.02);
        }

        /* Masquer les ancres automatiques des titres Streamlit (liens a cote des titres) */
        [data-testid="stMarkdownContainer"] h1 a,
        [data-testid="stMarkdownContainer"] h2 a,
        [data-testid="stMarkdownContainer"] h3 a {
            display: none !important;
        }

        /* Ajustements responsives pour mobile */
        @media (max-width: 768px) {
            .hero-container {
                padding: 32px 12px;
            }
            .hero-title {
                font-size: 2.4rem !important;
            }
            .hero-subtitle {
                font-size: 1rem !important;
                margin-bottom: 24px !important;
            }
            .metric-grid {
                grid-template-columns: 1fr;
                gap: 12px;
                margin: 24px 0;
            }
            .premium-card {
                padding: 20px;
                margin-bottom: 16px;
            }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

def inject_visual_polish(theme_mode: str):
    """Injects high-end visual polish that depends on the active theme."""
    if theme_mode == "dark":
        palette = {
            "surface_0": "#071426",
            "surface_1": "rgba(11, 37, 69, 0.86)",
            "surface_2": "#0d2039",
            "ink_1": "#e2e8f0",
            "ink_2": "#cbd5e1",
            "ink_3": "#94a3b8",
            "edge": "rgba(148, 163, 184, 0.24)",
            "shadow": "0 16px 34px rgba(2, 10, 24, 0.5)",
            "input_bg": "#0a1930",
        }
    else:
        palette = {
            "surface_0": "#f5f7f6",
            "surface_1": "rgba(255, 255, 255, 0.9)",
            "surface_2": "#ffffff",
            "ink_1": "#10253f",
            "ink_2": "#2f455f",
            "ink_3": "#64748b",
            "edge": "rgba(11, 37, 69, 0.11)",
            "shadow": "0 14px 34px rgba(11, 37, 69, 0.08)",
            "input_bg": "#ffffff",
        }

    st.markdown(
        f"""
        <style>
        :root {{
            --surface-0: {palette['surface_0']};
            --surface-1: {palette['surface_1']};
            --surface-2: {palette['surface_2']};
            --ink-1: {palette['ink_1']};
            --ink-2: {palette['ink_2']};
            --ink-3: {palette['ink_3']};
            --edge-soft: {palette['edge']};
            --shadow-card: {palette['shadow']};
            --input-bg: {palette['input_bg']};
            --brand: #2ec4b6;
            --brand-strong: #14b8a6;
            --brand-forest: #2e7d32;
            --brand-navy: #0b2545;
            --accent: #2b6cb0;
            --accent-soft: color-mix(in srgb, var(--accent) 14%, transparent);
            --radius-lg: 18px;
            --radius-md: 14px;
            --radius-sm: 10px;
            --space-1: 0.35rem;
            --space-2: 0.6rem;
            --space-3: 0.9rem;
            --space-4: 1.2rem;
            --space-5: 1.6rem;
            --focus-ring: 0 0 0 0.2rem rgba(37, 99, 235, 0.2);
        }}

        html, body, [class*="css"], .stApp {{
            font-family: 'Outfit', 'Inter', system-ui, -apple-system, 'Segoe UI', 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', Roboto, sans-serif !important;
        }}

        * {{
            box-sizing: border-box;
        }}

        .stApp {{
            background:
                radial-gradient(920px 470px at 8% -8%, color-mix(in srgb, var(--brand) 20%, transparent), transparent 70%),
                radial-gradient(760px 420px at 100% 0%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%),
                radial-gradient(680px 380px at 52% 100%, color-mix(in srgb, var(--brand-forest) 14%, transparent), transparent 74%),
                linear-gradient(180deg, color-mix(in srgb, var(--surface-0) 94%, #ffffff 6%), var(--surface-0)),
                var(--surface-0) !important;
            color: var(--ink-1);
        }}

        .main .block-container {{
            max-width: 1380px !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
            padding-bottom: 2.2rem !important;
        }}

        .main .block-container > div {{
            gap: 0.95rem !important;
        }}

        [data-testid="stHeader"] {{
            height: 0 !important;
            min-height: 0 !important;
            display: none !important;
        }}

        [data-testid="stAppViewContainer"] > .main {{
            padding-top: 0 !important;
        }}

        [data-testid="stVerticalBlock"] > div:has(> .top-control-shell) {{
            margin-top: 0 !important;
            padding-top: 0 !important;
        }}

        h1, h2, h3, h4, h5, h6,
        [data-testid="stMarkdownContainer"] p,
        [data-testid="stMarkdownContainer"] li,
        [data-testid="stMetricLabel"],
        label,
        span,
        small {{
            color: var(--ink-2) !important;
        }}

        [data-testid="stMarkdownContainer"] p {{
            line-height: 1.58;
        }}

        [data-testid="stMarkdownContainer"] h4,
        [data-testid="stMarkdownContainer"] h5 {{
            color: var(--ink-1) !important;
            letter-spacing: -0.01em;
        }}

        hr {{
            border: 0 !important;
            border-top: 1px solid color-mix(in srgb, var(--edge-soft) 72%, transparent) !important;
            margin: 16px 0 !important;
        }}

        .app-shell, .nav-shell, .premium-card, .section-shell,
        .metric-card, .kpi-chip, .top-control-shell,
        .stForm, .stExpander, div[data-testid="stMetric"],
        .stDataFrame, div[data-testid="stTable"] {{
            background: var(--surface-1) !important;
            border: 1px solid var(--edge-soft) !important;
            box-shadow: var(--shadow-card) !important;
        }}

        .top-control-shell,
        .app-shell,
        .nav-shell,
        .section-shell,
        .premium-card,
        .metric-card {{
            border-radius: 18px !important;
        }}

        .metric-card, .kpi-chip, .stExpander, div[data-testid="stMetric"] {{
            background: var(--surface-2) !important;
        }}

        .top-control-title {{
            font-size: 1.2rem;
            font-weight: 800;
            line-height: 1.2;
            color: var(--ink-1);
        }}

        .top-control-subtitle {{
            font-size: 0.82rem;
            line-height: 1.35;
            color: var(--ink-3);
        }}

        .rubric-pill-hint {{
            font-size: 0.82rem;
            line-height: 1.35;
            color: var(--ink-3);
        }}

        .rubric-controls {{
            margin-top: 8px;
        }}

        .rubric-controls .stButton > button {{
            border: 1px solid var(--edge-soft) !important;
            background: var(--surface-2) !important;
            color: var(--ink-1) !important;
            box-shadow: none !important;
            border-radius: 12px !important;
            font-weight: 700 !important;
        }}

        [data-testid="stNotification"],
        div[data-baseweb="notification"] {{
            border-radius: 14px !important;
            border: 1px solid var(--edge-soft) !important;
            background: var(--surface-2) !important;
        }}

        div[data-testid="stAlert"] {{
            border-radius: var(--radius-md) !important;
            border: 1px solid var(--edge-soft) !important;
            background: color-mix(in srgb, var(--surface-2) 92%, white 8%) !important;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
        }}

        div[data-testid="stAlert"] p {{
            color: var(--ink-2) !important;
            line-height: 1.5 !important;
        }}

        div[data-baseweb="checkbox"] > label {{
            border-radius: var(--radius-sm);
            padding: 6px 8px 6px 4px;
        }}

        [data-baseweb="slider"] [role="slider"] {{
            border: 2px solid #ffffff !important;
            box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand) 18%, transparent) !important;
        }}

        [data-testid="stDataFrame"],
        [data-testid="stDataEditor"],
        div[data-testid="stTable"] {{
            border-radius: var(--radius-lg);
            overflow: hidden;
            border: 1px solid var(--edge-soft);
            background: var(--surface-2) !important;
        }}

        div[data-testid="stTable"] table {{
            border-collapse: separate !important;
            border-spacing: 0 !important;
        }}

        div[data-testid="stTable"] th {{
            background: color-mix(in srgb, var(--surface-2) 84%, var(--brand) 16%) !important;
            color: var(--ink-1) !important;
            font-weight: 700 !important;
            border-bottom: 1px solid var(--edge-soft) !important;
        }}

        div[data-testid="stTable"] td {{
            color: var(--ink-2) !important;
            border-bottom: 1px solid color-mix(in srgb, var(--edge-soft) 70%, transparent) !important;
        }}

        [data-testid="stPlotlyChart"],
        [data-testid="stVegaLiteChart"],
        [data-testid="stPyplot"] {{
            border-radius: var(--radius-lg);
            border: 1px solid var(--edge-soft);
            background: var(--surface-2) !important;
            padding: 8px 8px 2px 8px;
            box-shadow: var(--shadow-card);
        }}

        iframe[title*="st_folium"],
        iframe[title*="streamlit_folium"] {{
            border-radius: var(--radius-lg) !important;
            border: 1px solid var(--edge-soft) !important;
            box-shadow: var(--shadow-card) !important;
            overflow: hidden;
        }}

        .stExpander {{
            border-radius: var(--radius-md) !important;
            overflow: hidden;
        }}

        .stExpander details summary p {{
            color: var(--ink-1) !important;
            font-weight: 730 !important;
            letter-spacing: -0.01em;
        }}

        .stProgress > div > div {{
            border-radius: 999px !important;
        }}

        .stProgress [role="progressbar"] {{
            background: linear-gradient(135deg, var(--brand), var(--accent)) !important;
        }}

        .stTabs [data-baseweb="tab-list"] {{
            gap: 8px;
        }}

        .stTabs [data-baseweb="tab"] {{
            border-radius: 12px !important;
            border: 1px solid var(--edge-soft) !important;
            background: var(--surface-2) !important;
            color: var(--ink-2) !important;
        }}

        .stTabs [aria-selected="true"] {{
            background: color-mix(in srgb, var(--brand) 22%, var(--brand-forest) 8%) !important;
            border-color: color-mix(in srgb, var(--brand) 50%, var(--brand-forest) 20%) !important;
            color: var(--ink-1) !important;
        }}

        @media (max-width: 1100px) {{
            .main .block-container {{
                max-width: 100% !important;
                padding-top: 0 !important;
                margin-top: 0 !important;
            }}

            .metric-grid {{
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }}
        }}

        @media (max-width: 720px) {{
            .top-control-shell {{
                padding: 10px;
            }}

            .top-control-head {{
                flex-direction: column;
                align-items: flex-start;
                gap: 2px;
            }}

            .metric-grid {{
                grid-template-columns: 1fr !important;
            }}

            .rubric-pill {{
                min-width: 202px;
                max-width: 230px;
            }}

            .app-shell {{
                padding: 18px 16px !important;
            }}

            .app-shell-title {{
                max-width: 100%;
                font-size: clamp(1.7rem, 7vw, 2.2rem);
            }}

            .section-shell {{
                padding: 14px 14px 12px 14px !important;
            }}

            .rubric-controls .stButton > button {{
                min-height: 50px !important;
            }}
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )
