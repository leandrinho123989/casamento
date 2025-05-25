const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const lockfile = require('proper-lockfile');

const app = express();
const publicDir = path.join(__dirname, 'public');

// =============================================
// Novas Rotas de Visualização
// =============================================

// Rota para visualizar confirmações
app.get('/presencas', async (req, res) => {
  try {
    const presencasPath = path.join(publicDir, 'presencas.json');
    const rawData = await fs.promises.readFile(presencasPath, 'utf8');
    const presencas = JSON.parse(rawData);

    const estatisticas = {
      totalConvidados: presencas.length,
      totalConfirmados: presencas.reduce((acc, curr) => acc + curr.confirmados.length, 0),
      detalhes: presencas.map(p => ({
        convidadoPrincipal: p.convidadoPrincipal,
        confirmados: p.confirmados,
        dataConfirmacao: p._metadata.timestamp
      }))
    };

    res.json(estatisticas);
  } catch (error) {
    console.error('Erro ao ler presenças:', error);
    res.status(500).json({ error: 'Erro ao carregar dados' });
  }
});

// Rota para visualizar reservas
app.get('/reservas', async (req, res) => {
  try {
    const [reservasData, presentesData] = await Promise.all([
      fs.promises.readFile(path.join(publicDir, 'reservas.json'), 'utf8'),
      fs.promises.readFile(path.join(publicDir, 'presentes.json'), 'utf8')
    ]);

    const reservas = JSON.parse(reservasData);
    const presentes = JSON.parse(presentesData);

    const reservasFormatadas = presentes.map(presente => {
      const reserva = reservas.find(r => r.id_presente === presente.id);
      return {
        presente: presente.nome,
        reservado: !!reserva,
        reservadoPor: reserva?.nome || 'Disponível',
        dataReserva: reserva?._metadata.timestamp
      };
    });

    res.json({
      totalReservados: reservas.length,
      totalPresentes: presentes.length,
      detalhes: reservasFormatadas
    });
  } catch (error) {
    console.error('Erro ao ler reservas:', error);
    res.status(500).json({ error: 'Erro ao carregar dados' });
  }
});

// Nova rota para buscar convidados
app.get('/convidados', async (req, res) => {
  try {
    const convidadosPath = path.join(publicDir, 'convidados.json');
    const rawData = await fs.promises.readFile(convidadosPath, 'utf8');
    res.json(JSON.parse(rawData));
  } catch (error) {
    console.error('Erro ao carregar convidados:', error);
    res.status(500).json({ error: 'Erro ao carregar lista de convidados' });
  }
});

// =============================================
// Configurações Iniciais
// =============================================
(async () => {
  try {
    if (!fs.existsSync(publicDir)) {
      await fs.promises.mkdir(publicDir, { recursive: true });
      console.log('📁 Diretório público criado');
    }

    // Criar arquivos essenciais com estrutura inicial
    const essentialFiles = {
      'presencas.json': [],
      'reservas.json': [],
      'presentes.json': [
        {
          id: 1,
          nome: "Jantar Romântico",
          foto: "fotos/presente-01.jpg"
        }
      ],
      'convidados.json': [] // Arquivo vazio será preenchido com dados da planilha
    };

    for (const [file, initialData] of Object.entries(essentialFiles)) {
      const filePath = path.join(publicDir, file);
      if (!fs.existsSync(filePath)) {
        await fs.promises.writeFile(filePath, JSON.stringify(initialData));
        console.log(`✅ Arquivo ${file} inicializado`);
      }
    }
  } catch (error) {
    console.error('Erro na inicialização:', error);
    process.exit(1);
  }
})();

// =============================================
// Middlewares
// =============================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.static(publicDir));

// Middleware de logs detalhados
app.use((req, res, next) => {
  const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`;
  fs.promises.appendFile('access.log', logMessage + '\n');
  next();
});

// =============================================
// Rotas de API
// =============================================

// Rota de saúde do servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    files: fs.readdirSync(publicDir),
    uptime: process.uptime()
  });
});

// Nova rota para salvar presenças
app.post('/salvar-presenca', async (req, res) => {
  const presencasPath = path.join(publicDir, 'presencas.json');
  
  try {
    console.log('📥 Recebendo confirmação de presença:', req.body);

    if (!req.body?.convidadoPrincipal?.trim()) {
      throw new Error('Nome do convidado principal é obrigatório');
    }

    if (!Array.isArray(req.body.confirmados)) {
      throw new Error('Formato inválido para lista de confirmados');
    }

    const release = await lockfile.lock(presencasPath, {
      retries: 5,
      retryInterval: 1000,
      stale: 5000
    });

    const rawData = await fs.promises.readFile(presencasPath, 'utf8');
    const presencas = JSON.parse(rawData);

    const novaPresenca = {
      convidadoPrincipal: req.body.convidadoPrincipal,
      confirmados: req.body.confirmados,
      _metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }
    };

    presencas.push(novaPresenca);

    await fs.promises.writeFile(
      presencasPath,
      JSON.stringify(presencas, null, 2),
      'utf8'
    );

    await release();
    console.log('✅ Presença confirmada com sucesso');

    res.json({ success: true, recordsCount: presencas.length });

  } catch (error) {
    console.error('❌ Erro crítico:', error);
    res.status(500).json({
      error: 'Falha ao salvar confirmação',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Rota para reservas de presentes
app.post('/salvar-reserva', async (req, res) => {
  const reservasPath = path.join(publicDir, 'reservas.json');
  
  try {
    console.log('📥 Recebendo reserva:', req.body);

    if (!req.body?.id_presente || !req.body?.nome?.trim()) {
      throw new Error('Dados incompletos para reserva');
    }

    const release = await lockfile.lock(reservasPath, {
      retries: 5,
      retryInterval: 1000
    });

    const rawData = await fs.promises.readFile(reservasPath, 'utf8');
    let reservas = JSON.parse(rawData);

    // Verificar se já está reservado
    if (reservas.some(r => r.id_presente === req.body.id_presente)) {
      throw new Error('Presente já reservado');
    }

    const novaReserva = {
      ...req.body,
      _metadata: {
        ip: req.ip,
        timestamp: new Date().toISOString()
      }
    };

    reservas.push(novaReserva);

    await fs.promises.writeFile(
      reservasPath,
      JSON.stringify(reservas, null, 2),
      'utf8'
    );

    await release();
    console.log('✅ Reserva salva com sucesso');

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Erro na reserva:', error);
    res.status(400).json({
      error: 'Falha na reserva',
      details: error.message
    });
  }
});

// =============================================
// Tratamento de Erros Global
// =============================================
app.use((err, req, res, next) => {
  const errorLog = `[${new Date().toISOString()}] ERRO: ${err.stack || err.message}\n`;
  
  fs.promises.appendFile('error.log', errorLog)
    .catch(console.error);

  res.status(500).json({
    error: 'Erro interno inesperado',
    details: process.env.NODE_ENV !== 'production' ? {
      message: err.message,
      stack: err.stack
    } : undefined
  });
});

// =============================================
// Inicialização do Servidor
// =============================================
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
  🚀 Servidor rodando na porta: ${PORT}
  🕒 ${new Date().toLocaleString()}
  📂 Diretório público: ${publicDir}
  🌐 Modo: ${process.env.NODE_ENV || 'development'}
  `);
});

// Gerenciamento de shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando servidor...');
  
  server.close(async () => {
    console.log('✅ Servidor encerrado com sucesso');
    process.exit(0);
  });
});