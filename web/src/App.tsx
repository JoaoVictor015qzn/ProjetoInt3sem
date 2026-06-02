import { Shield, Zap, Lock, Users, ChevronRight, Mail, Code, Briefcase } from 'lucide-react';

function App() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Background Blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      {/* Navbar */}
      <nav className="navbar glass">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield className="text-gradient" size={28} />
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Secur<span className="text-gradient">Gate</span></span>
          </div>
          <div className="nav-links">
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollTo('about'); }}>O Projeto</a>
            <a href="#developers" onClick={(e) => { e.preventDefault(); scrollTo('developers'); }}>Desenvolvedores</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); scrollTo('contact'); }}>Contato</a>
          </div>
          <button className="btn btn-outline" onClick={() => window.location.href = '/app/'}>
            Acessar Sistema
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero container">
        <div className="hero-content">
          <h1 className="hero-title">
            Controle de Acesso <br />
            <span className="text-gradient">Inteligente & Seguro</span>
          </h1>
          <p className="hero-description">
            Plataforma corporativa para gestão de acessos em subestações de energia. Auditoria em tempo real, validação de permissões e controle total na palma da sua mão.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={() => window.location.href = '/app/'}>
              Acessar Painel <ChevronRight size={20} />
            </button>
            <button className="btn btn-outline" onClick={() => scrollTo('about')}>
              Saiba Mais
            </button>
          </div>
        </div>
        <div className="hero-image-container">
          <img
            src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800"
            alt="Data Center Server Security"
            className="hero-mockup"
          />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="section container">
        <h2 className="section-title">O que é o <span className="text-gradient">Projeto?</span></h2>
        <p className="section-subtitle">
          Uma solução integrada que une hardware IoT e software em nuvem para garantir que apenas pessoal qualificado acesse áreas de alto risco.
        </p>

        <div className="grid-3">
          <div className="glass-card">
            <div className="feature-icon"><Lock size={24} /></div>
            <h3 className="feature-title">Segurança IoT</h3>
            <p className="feature-desc">Validação imediata através de crachás RFID nos portões das subestações, bloqueando acessos não autorizados em milissegundos.</p>
          </div>
          <div className="glass-card">
            <div className="feature-icon"><Zap size={24} /></div>
            <h3 className="feature-title">Conformidade NR-10</h3>
            <p className="feature-desc">Garante que apenas colaboradores com treinamentos em dia e permissões válidas possam realizar manutenções.</p>
          </div>
          <div className="glass-card">
            <div className="feature-icon"><Users size={24} /></div>
            <h3 className="feature-title">Gestão Centralizada</h3>
            <p className="feature-desc">Dashboard intuitivo em React Native Web para cadastro de funcionários, relatórios e auditoria com exportação para PDF e Excel.</p>
          </div>
        </div>
      </section>

      {/* Developers Section */}
      <section id="developers" className="section container">
        <h2 className="section-title">Conheça os <span className="text-gradient">Desenvolvedores</span></h2>
        <p className="section-subtitle">
          Criado por especialistas dedicados a transformar a segurança da infraestrutura de energia.
        </p>

        <div className="grid-3" style={{ justifyContent: 'center' }}>
          <div className="glass-card dev-card">
            <img src="/joao.jpeg" alt="João Victor" className="dev-avatar" onError={(e) => (e.currentTarget.src = "https://ui-avatars.com/api/?name=Joao+Victor&background=0D8ABC&color=fff&size=200")} />
            <h3 className="dev-name">João Victor</h3>
            <p className="dev-role">Software Engineer</p>
            <div className="dev-socials">
              <a href="#"><Code size={20} /></a>
              <a href="#"><Briefcase size={20} /></a>
            </div>
          </div>
          <div className="glass-card dev-card">
            <img src="/joacir.jpeg" alt="Joacir Peçanha" className="dev-avatar" onError={(e) => (e.currentTarget.src = "https://ui-avatars.com/api/?name=Joacir+Pecanha&background=2563eb&color=fff&size=200")} />
            <h3 className="dev-name">Joacir Peçanha</h3>
            <p className="dev-role">Hardware & IoT</p>
            <div className="dev-socials">
              <a href="#"><Code size={20} /></a>
              <a href="#"><Briefcase size={20} /></a>
            </div>
          </div>
          <div className="glass-card dev-card">
            <img src="/andre.jpeg" alt="André Fernandes" className="dev-avatar" onError={(e) => (e.currentTarget.src = "https://ui-avatars.com/api/?name=Andre+Fernandes&background=38bdf8&color=fff&size=200")} />
            <h3 className="dev-name">André Fernandes</h3>
            <p className="dev-role">Software Engineer</p>
            <div className="dev-socials">
              <a href="#"><Code size={20} /></a>
              <a href="#"><Briefcase size={20} /></a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="section container" style={{ maxWidth: '800px' }}>
        <h2 className="section-title">Entre em <span className="text-gradient">Contato</span></h2>
        <p className="section-subtitle">
          Interessado em implementar nosso sistema em sua infraestrutura? Fale com a gente.
        </p>

        <div className="glass-card">
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input type="text" className="form-input" placeholder="João da Silva" />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail Corporativo</label>
                <input type="email" className="form-input" placeholder="joao@empresa.com" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Mensagem</label>
              <textarea className="form-input" placeholder="Gostaria de agendar uma demonstração..." />
            </div>
            <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
              <Mail size={18} /> Enviar Mensagem
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} SecurGate. Todos os direitos reservados. Projeto Integrador.</p>
        </div>
      </footer>
    </>
  );
}

export default App;
