interface HeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const TABS = ['Overview', 'Patient explorer', 'Interactive demo']

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return <header className="topbar">
    <div className="brand"><span className="brand-mark">CA</span><span><strong>Coronary Atlas</strong><small>Clinical visualization suite</small></span></div>
    <nav>{TABS.map((tab) => <button key={tab} className={activeTab === tab ? 'nav-active' : ''} onClick={() => onTabChange(tab)}>{tab}</button>)}</nav>
    <button className="export-button" onClick={() => window.print()}>Export snapshot <span>↗</span></button>
  </header>
}
