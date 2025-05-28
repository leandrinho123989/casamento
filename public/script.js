// =============================================
// Configurações Globais
// =============================================
const API_ENDPOINTS = {
    presencas: '/salvar-presenca',
    reservas: '/salvar-reserva',
    convidados: '/convidados'
};

let currentFilter = 'all';
let slideIndex = 0;
const CONVIDADOS_MOCK = [ // Mock para testes
    {
        convidadoPrincipal: "Leandro Borges",
        acompanhantes: ["Maria Silva", "João Oliveira"]
    }
];

// =============================================
// Sistema de Confirmação de Presença
// =============================================
async function carregarConvidados() {
    try {
         const response = await fetch(API_ENDPOINTS.convidados);
         return await response.json();
        
        return CONVIDADOS_MOCK; // Mock temporário
    } catch (error) {
        mostrarErro('Erro ao carregar convidados', error);
        return [];
    }
}

function exibirResultadosPesquisa(resultados) {
    const container = document.getElementById('resultadosPesquisa');
    container.innerHTML = resultados.length > 0 
        ? resultados.map(convidado => `
            <div class="resultado-item" data-nome="${convidado.convidadoPrincipal}">
                <span class="nome-convidado">${convidado.convidadoPrincipal}</span>
            </div>
        `).join('')
        : `<div class="nenhum-resultado">😕 Nenhum convidado encontrado</div>`;
}


function criarCheckboxAcompanhantes(acompanhantes) {
    return acompanhantes.map(acomp => `
        <div class="item-acompanhante">
            <label>
                <input type="checkbox" name="confirmados" value="${acomp}" checked>
                ${acomp}
            </label>
        </div>
    `).join('');
}

async function carregarDetalhesConvidado(nome) {
    try {
        const convidados = await carregarConvidados();
        const convidado = convidados.find(c => c.convidadoPrincipal === nome);
        
        if (!convidado) {
            throw new Error('Convidado não encontrado');
        }

        document.getElementById('nomeConvidadoPrincipal').textContent = nome;
        document.getElementById('listaAcompanhantes').innerHTML = 
            criarCheckboxAcompanhantes(convidado.acompanhantes);
        document.getElementById('formConfirmacao').style.display = 'block';
    } catch (error) {
        Swal.fire('Erro', error.message, 'error');
    }
}

// =============================================
// Sistema de Presentes
// =============================================
async function carregarPresentes() {
    try {
        const listaPresentes = document.getElementById('lista-presentes');
        listaPresentes.classList.add('loading');
        listaPresentes.innerHTML = Array(6).fill('<div class="presente-item-premium skeleton-loading"></div>').join('');

        const [presentes, reservas] = await Promise.all([
            fetch('presentes.json').then(r => r.json()),
            fetch('reservas.json').then(r => r.json())
        ]);

        listaPresentes.innerHTML = presentes.map(presente => 
            presente.tipo === 'pix'
                ? renderizarPix(presente)
                : renderizarPresente(presente, reservas)
        ).join('');

        filtrarPresentes(currentFilter);
        atualizarContadores();
    } catch (error) {
        mostrarErro('Erro ao carregar presentes', error);
    } finally {
        listaPresentes.classList.remove('loading');
    }
}

function renderizarPresente(presente, reservas) {
    const reservado = reservas.some(r => r.id_presente === presente.id);
    return `
        <div class="presente-item-premium ${reservado ? 'reservado' : ''}">
            <div class="presente-content">
                <img src="${presente.foto}" alt="${presente.nome}" class="foto-presente-premium">
                <h3>${presente.nome}</h3>
                <div class="presente-status-premium ${reservado ? 'reservado' : 'disponivel'}">
                    ${reservado ? '⛔ Reservado' : '✅ Disponível'}
                </div>
            </div>
            <button class="reservar-btn-premium" 
                onclick="reservarPresente(${presente.id}, '${presente.nome.replace(/'/g, "\\'")}')" 
                ${reservado ? 'disabled' : ''}>
                ${reservado ? 'Indisponível' : 'Reservar'}
            </button>
        </div>`;
}

function renderizarPix(presente) {
    return `
        <div class="presente-item-premium pix-item" onclick="mostrarChavePix('${presente.chave}')">
            <div class="presente-content">
                <img src="${presente.foto}" alt="Presente em dinheiro" class="foto-presente-premium">
                <h3>${presente.nome}</h3>
                <div class="presente-status-premium disponivel">
                    💸 Clique para ver a chave PIX
                </div>
            </div>
        </div>`;
}

// =============================================
// Funções Compartilhadas
// =============================================
function filtrarPresentes(filtro) {
    currentFilter = filtro;
    document.querySelectorAll('.presente-item-premium').forEach(item => {
        const isPix = item.classList.contains('pix-item');
        const isReservado = item.classList.contains('reservado');
        
        item.style.display = isPix ? 'block' : 
            filtro === 'disponiveis' ? !isReservado :
            filtro === 'reservados' ? isReservado : 'block';
    });
    atualizarContadores();
}

function atualizarContadores() {
    const total = document.querySelectorAll('.presente-item-premium:not(.pix-item)').length;
    const disponiveis = document.querySelectorAll('.presente-item-premium:not(.reservado):not(.pix-item)').length;
    document.getElementById('disponiveis-count').textContent = disponiveis;
    document.getElementById('total-count').textContent = total;
}

// =============================================
// Sistema de Carrossel
// =============================================
function showSlide(index) {
    const slides = document.querySelector('.slides');
    slides.style.transform = `translateX(-${index * 100}%)`;
    slideIndex = index;
}

function nextSlide() {
    showSlide((slideIndex + 1) % document.querySelectorAll('.slide').length);
}

function prevSlide() {
    showSlide((slideIndex - 1 + document.querySelectorAll('.slide').length) % document.querySelectorAll('.slide').length);
}

// =============================================
// Contagem Regressiva
// =============================================
function updateCountdown() {
    const eventDate = new Date('2025-07-19T12:00:00');
    const now = new Date();
    const diff = eventDate - now;

    if (diff <= 0) {
        document.getElementById('countdown').innerHTML = `
            <div class="evento-hoje">
                <h3>É hoje! ❤️</h3>
                <p>Nos vemos em breve!</p>
            </div>`;
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    document.getElementById('days-value').textContent = days.toString().padStart(2, '0');
    document.getElementById('hours-value').textContent = hours.toString().padStart(2, '0');
    document.getElementById('minutes-value').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('seconds-value').textContent = seconds.toString().padStart(2, '0');
}

// =============================================
// Utilitários
// =============================================
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
}

function mostrarErro(titulo, error) {
    console.error(error);
    Swal.fire(titulo, error.message || 'Erro desconhecido', 'error');
}

// =============================================
// Event Listeners e Inicialização
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    // Configuração inicial
    setInterval(updateCountdown, 1000);
    updateCountdown();
    showSlide(0);

    // Presentes
    document.getElementById('botao-ver-presentes').addEventListener('click', () => {
        document.getElementById('modal-presentes').style.display = 'flex';
        carregarPresentes();
    });

    // Filtros
    document.querySelectorAll('.filtros button').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelector('.filtro-ativo')?.classList.remove('filtro-ativo');
            this.classList.add('filtro-ativo');
            filtrarPresentes(this.dataset.filter);
        });
    });

    // Pesquisa de presentes
    document.getElementById('searchInput').addEventListener('input', debounce(e => {
        const termo = e.target.value.toLowerCase();
        document.querySelectorAll('.presente-item-premium').forEach(item => {
            item.style.display = item.querySelector('h3').textContent.toLowerCase().includes(termo) ? 'block' : 'none';
        });
        atualizarContadores();
    }, 300));

    // Confirmação de presença
    document.getElementById('pesquisaInput').addEventListener('input', debounce(async (e) => {
        const termo = e.target.value.trim().toLowerCase();
        const resultadosDiv = document.getElementById('resultadosPesquisa');
        const loadingDiv = document.getElementById('loadingPesquisa');
        
        resultadosDiv.innerHTML = '';
        if (termo.length < 3) {
            loadingDiv.style.display = 'none';
            return;
        }

        try {
            loadingDiv.style.display = 'block';
            const convidados = await carregarConvidados();
            const resultados = convidados.filter(c =>
                c?.convidadoPrincipal?.toLowerCase().includes(termo) ||
                (Array.isArray(c?.acompanhantes) && c.acompanhantes.some(a => a.toLowerCase().includes(termo)))
              );
              
            exibirResultadosPesquisa(resultados);
        } catch (error) {
            mostrarErro('Erro na pesquisa', error);
        } finally {
            loadingDiv.style.display = 'none';
        }
    }, 300));

    document.getElementById('resultadosPesquisa').addEventListener('click', (e) => {
        const convidado = e.target.closest('.resultado-item');
        if (convidado) {
            document.getElementById('pesquisaInput').value = convidado.dataset.nome;
            document.getElementById('resultadosPesquisa').innerHTML = '';
            carregarDetalhesConvidado(convidado.dataset.nome);
        }
    });

    document.getElementById('formConfirmacao').addEventListener('submit', async (e) => {
        e.preventDefault();
        const confirmados = Array.from(document.querySelectorAll('input[name="confirmados"]:checked'))
            .map(cb => cb.value);
        
        try {
            const response = await fetch(API_ENDPOINTS.presencas, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    convidadoPrincipal: document.getElementById('nomeConvidadoPrincipal').textContent,
                    confirmados
                })
            });

            if (response.ok) {
                Swal.fire('✅ Sucesso!', 'Presença confirmada com sucesso!', 'success');
                document.getElementById('formConfirmacao').reset();
                document.getElementById('formConfirmacao').style.display = 'none';
                document.getElementById('pesquisaInput').value = '';
            }
        } catch (error) {
            mostrarErro('Erro na confirmação', error);
        }
    });

    // Carrossel
    document.querySelector('.prev').addEventListener('click', prevSlide);
    document.querySelector('.next').addEventListener('click', nextSlide);
    
    // Controle touch
    const carrossel = document.querySelector('.carrossel-elegante');
    if (carrossel) {
        let touchStartX = 0;
        
        carrossel.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].clientX;
        });

        carrossel.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].clientX;
            Math.abs(touchStartX - touchEndX) > 50 && (touchStartX > touchEndX ? nextSlide() : prevSlide());
        });
    }
});

// =============================================
// Funções Globais
// =============================================
window.mostrarChavePix = function(chave) {
    Swal.fire({
        title: 'Chave PIX',
        html: `
            <div class="pix-container">
                <input type="text" id="pix-chave" value="${chave}" readonly>
                <button onclick="copiarChavePix()" class="botao-copiar">📋 Copiar</button>
            </div>`,
        showConfirmButton: false,
        background: 'var(--color-background)'
    });
};

window.copiarChavePix = function() {
    navigator.clipboard.writeText(document.getElementById('pix-chave').value);
    Swal.fire('✅ Copiado!', 'Chave PIX copiada para área de transferência', 'success');
};

window.reservarPresente = async function(id, nome) {
    try {
        const { value: nomeReserva } = await Swal.fire({
            title: `Reservar ${nome}`,
            input: 'text',
            inputLabel: 'Digite seu nome completo:',
            inputValidator: (value) => !value && 'Nome obrigatório!'
        });

        const response = await fetch(API_ENDPOINTS.reservas, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_presente: id, nome: nomeReserva })
        });

        if (!response.ok) throw new Error('Falha na reserva');
        
        Swal.fire('✅ Sucesso!', `${nome} reservado por ${nomeReserva}`, 'success');
        carregarPresentes();
    } catch (error) {
        mostrarErro('Erro na reserva', error);
    }
};

window.fecharModal = function() {
    document.getElementById('modal-presentes').style.display = 'none';
};