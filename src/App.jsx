import { useState } from 'react'
import Today       from './tabs/Today.jsx'
import Whoop       from './tabs/Whoop.jsx'
import Budget      from './tabs/Budget.jsx'
import Diet        from './tabs/Diet.jsx'
import Training    from './tabs/Training.jsx'
import Supplements from './tabs/Supplements.jsx'
import RacePlan    from './tabs/RacePlan.jsx'
import Phases      from './tabs/Phases.jsx'
import Books       from './tabs/Books.jsx'

const TABS = [
  { id: 'today',       label: 'Today',       component: Today       },
  { id: 'whoop',       label: 'Whoop',       component: Whoop       },
  { id: 'budget',      label: 'Budget',      component: Budget      },
  { id: 'diet',        label: 'Diet',        component: Diet        },
  { id: 'training',    label: 'Training',    component: Training    },
  { id: 'supplements', label: 'Supplements', component: Supplements },
  { id: 'races',       label: 'Race Plan',   component: RacePlan    },
  { id: 'phases',      label: 'Phases',      component: Phases      },
  { id: 'books',       label: 'Books',       component: Books       },
]

const HERO_STATS = [
  { label: 'Current Weight', value: '84kg',   color: 'text-gold'  },
  { label: 'Target Weight',  value: '75kg',   color: 'text-sage'  },
  { label: 'Daily Calories', value: '2,000',  color: 'text-gold'  },
  { label: 'Protein Target', value: '160g',   color: 'text-sage'  },
  { label: 'Half Target',    value: '1:45',   color: 'text-coral' },
  { label: 'Race Day',       value: '15 Nov', color: 'text-coral' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('today')
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? Today

  return (
    <div className="min-h-screen bg-app-bg text-ivory font-mono">
      {/* Hero */}
      <header className="relative px-6 pt-14 pb-10 border-b border-dark-border overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(232,213,163,0.04) 0%, transparent 70%)' }}
        />
        <p className="text-[10px] tracking-[0.2em] text-stone uppercase mb-3">
          Personal Performance Plan · 2026–2027
        </p>
        <h1 className="font-serif text-[clamp(36px,8vw,72px)] font-black leading-none tracking-[-2px] mb-2">
          Miguel's<br />
          <span className="text-gold">Master Plan</span>
        </h1>
        <p className="text-[11px] text-stone tracking-[0.1em] mb-8">
          MALTA · PwC · ŻURRIEQ HALF · MALTA MARATHON
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
          {HERO_STATS.map(({ label, value, color }) => (
            <div key={label} className="bg-subtle border border-dark-border rounded-lg px-3.5 py-3">
              <p className="text-[9px] text-stone tracking-[0.12em] uppercase mb-1">{label}</p>
              <p className={`font-serif text-[22px] font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex border-b border-dark-border overflow-x-auto sticky top-0 bg-app-bg z-10 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main className="px-6 py-6 max-w-2xl">
        <ActiveComponent />
      </main>
    </div>
  )
}
