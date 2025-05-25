// =============================================
// Variáveis Globais e Constantes
// =============================================
let currentFilter = 'all';
let currentIndex = 0;
let searchTimeout;
const API_ENDPOINTS = {
    presencas: '/salvar-presenca',
    reservas: '/salvar-reserva',
    convidados: '/convidados'
};

// =============================================
// Sistema de Confirmação de Presença (NOVO)
// =============================================

async function carregarConvidados() {
    const response = await fetch(API_ENDPOINTS.convidados);
    return await response.json();
}

function exibirResultadosPesquisa(resultados) {
    const container = document.getElementById('resultadosPesquisa');
    container.innerHTML = resultados.map(convidado => `
        <div class="resultado-item" data-nome="${convidado.convidado}">
            ${convidado.convidado}
        </div>
    `).join('');
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
    const convidados = await carregarConvidados();
    const convidado = convidados.find(c => c.convidado === nome);
    
    document.getElementById('nomeConvidadoPrincipal').textContent = nome;
    document.getElementById('listaAcompanhantes').innerHTML = 
        criarCheckboxAcompanhantes(convidado.acompanhantes);
    document.getElementById('formConfirmacao').style.display = 'block';
}

// =============================================
// Sistema de Presentes
// =============================================

async function carregarPresentes() {
    try {
        const listaPresentes = document.getElementById('lista-presentes');
        listaPresentes.classList.add('loading');
        listaPresentes.innerHTML = Array(6).fill(`
            <div class="presente-item-premium skeleton-loading"></div>
        `).join('');

        const [presentes, reservas] = await Promise.all([
            fetch('presentes.json').then(r => r.json()),
            fetch('reservas.json').then(r => r.json())
        ]);

        listaPresentes.innerHTML = presentes.map(presente => renderizarPresente(presente, reservas)).join('');

        filtrarPresentes(currentFilter);
        atualizarContadores();
        listaPresentes.classList.remove('loading');
    } catch (error) {
        listaPresentes.classList.remove('loading');
        mostrarErro('Erro ao carregar presentes', error);
    }
}

function renderizarPresente(presente, reservas) {
    if(presente.tipo === 'pix') {
        return `
            <div class="presente-item-premium pix-item" onclick="mostrarChavePix('${presente.chave}')">
                <div class="presente-content">
                    <img src="${presente.foto}" alt="${presente.nome}" class="foto-presente-premium">
                    <h3>${presente.nome}</h3>
                    <div class="presente-status-premium disponivel">
                        💸 Clique para ver a chave PIX
                    </div>
                </div>
            </div>`;
    }

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

// =============================================
// Funções Compartilhadas
// =============================================

function filtrarPresentes(filtro) {
    currentFilter = filtro;
    const itens = document.querySelectorAll('.presente-item-premium');
    
    itens.forEach(item => {
        const isPix = item.classList.contains('pix-item');
        const isReservado = item.classList.contains('reservado');
        
        if(isPix) {
            item.style.display = 'block';
            return;
        }

        switch(filtro) {
            case 'disponiveis':
                item.style.display = isReservado ? 'none' : 'block';
                break;
            case 'reservados':
                item.style.display = isReservado ? 'block' : 'none';
                break;
            default:
                item.style.display = 'block';
        }
    });
    atualizarContadores();
}

function fecharModal() {
    document.getElementById('modal-presentes').style.display = 'none';
}

function atualizarContadores() {
    const total = document.querySelectorAll('.presente-item-premium:not(.pix-item)').length;
    const disponiveis = document.querySelectorAll('.presente-item-premium:not(.reservado):not(.pix-item)').length;
    
    document.getElementById('disponiveis-count').textContent = disponiveis;
    document.getElementById('total-count').textContent = total;
}

// =============================================
// Funções de Utilitários
// =============================================

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

function mostrarErro(titulo, error) {
    console.error(error);
    Swal.fire(titulo, error.message, 'error');
}

// =============================================
// Sistema de Carrossel
// =============================================

let slideIndex = 0;
const slides = document.querySelectorAll('.slide');

function showSlide(index) {
    const offset = index * -100;
    document.querySelector('.slides').style.transform = `translateX(${offset}%)`;
    slideIndex = index;
}

function nextSlide() {
    const newIndex = (slideIndex + 1) % slides.length;
    showSlide(newIndex);
}

function prevSlide() {
    const newIndex = (slideIndex - 1 + slides.length) % slides.length;
    showSlide(newIndex);
}

// =============================================
// Sistema Principal
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
// Event Listeners
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // Configuração básica
    setInterval(updateCountdown, 1000);
    updateCountdown();
    showSlide(0);

    // Sistema de Presentes
    document.getElementById('botao-ver-presentes').addEventListener('click', () => {
        document.getElementById('modal-presentes').style.display = 'flex';
        carregarPresentes();
    });

    document.querySelectorAll('.filtros button').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelector('.filtro-ativo')?.classList.remove('filtro-ativo');
            this.classList.add('filtro-ativo');
            filtrarPresentes(this.dataset.filter);
        });
    });

    document.querySelector('.search-box input').addEventListener('input', debounce(e => {
        const termo = e.target.value.toLowerCase();
        document.querySelectorAll('.presente-item-premium').forEach(item => {
            item.style.display = item.querySelector('h3').textContent.toLowerCase().includes(termo) 
                ? 'block' 
                : 'none';
        });
        atualizarContadores();
    }, 300));

    // Sistema de Confirmação (NOVO)
    document.getElementById('pesquisaInput').addEventListener('input', debounce(async (e) => {
        const termo = e.target.value.toLowerCase();
        if(termo.length < 3) {
            document.getElementById('resultadosPesquisa').innerHTML = '';
            return;
        }
        
        const convidados = await carregarConvidados();
        const resultados = convidados.filter(c => 
            c.convidado.toLowerCase().includes(termo)
        );
        exibirResultadosPesquisa(resultados);
    }, 300));

    document.getElementById('resultadosPesquisa').addEventListener('click', (e) => {
        const convidado = e.target.closest('.resultado-item');
        if (convidado) {
            const nome = convidado.dataset.nome;
            document.getElementById('pesquisaInput').value = nome;
            document.getElementById('resultadosPesquisa').innerHTML = '';
            carregarDetalhesConvidado(nome);
        }
    });

    document.getElementById('formConfirmacao').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const convidadoPrincipal = document.getElementById('nomeConvidadoPrincipal').textContent;
        const checkboxes = document.querySelectorAll('input[name="confirmados"]:checked');
        const confirmados = Array.from(checkboxes).map(cb => cb.value);
        
        try {
            const response = await fetch(API_ENDPOINTS.presencas, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ convidadoPrincipal, confirmados })
            });
            
            if (response.ok) {
                Swal.fire('✅ Confirmação salva!', 'Obrigado por confirmar sua presença!', 'success');
                document.getElementById('formConfirmacao').reset();
                document.getElementById('formConfirmacao').style.display = 'none';
                document.getElementById('pesquisaInput').value = '';
            }
        } catch (error) {
            Swal.fire('❌ Erro', 'Houve um problema ao salvar a confirmação', 'error');
        }
    });

    // Sistema de Carrossel
    document.querySelector('.prev').addEventListener('click', prevSlide);
    document.querySelector('.next').addEventListener('click', nextSlide);

    // Controle touch para carrossel
    const carrossel = document.querySelector('.carrossel-elegante');
    if(carrossel) {
        let touchStartX = 0;
        
        carrossel.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].clientX;
        });

        carrossel.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;
            if(Math.abs(diff) > 50) {
                diff > 0 ? nextSlide() : prevSlide();
            }
        });
    }
});

// =============================================
// Funções Globais
// =============================================

function mostrarChavePix(chave) {
    Swal.fire({
        title: 'Chave PIX',
        html: `
            <div class="pix-container">
                <input type="text" id="pix-chave" value="${chave}" readonly>
                <button onclick="copiarChavePix()" class="botao-copiar">
                    📋 Copiar
                </button>
            </div>`,
        showConfirmButton: false,
        background: 'var(--color-background)'
    });
}

function copiarChavePix() {
    const chave = document.getElementById('pix-chave').value;
    navigator.clipboard.writeText(chave);
    Swal.fire('✅ Copiado!', 'Chave PIX na área de transferência', 'success');
}

async function reservarPresente(id, nome) {
    try {
        const { value: nomeReserva } = await Swal.fire({
            title: `Reservar ${nome}`,
            input: 'text',
            inputLabel: 'Digite seu nome completo:',
            inputValidator: (value) => !value && 'O nome é obrigatório!'
        });

        const response = await fetch(API_ENDPOINTS.reservas, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_presente: id, nome: nomeReserva })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Falha na reserva');
        }

        Swal.fire('✅ Reservado!', `${nome} reservado por ${nomeReserva}`, 'success');
        carregarPresentes();
        
    } catch (error) {
        Swal.fire('❌ Erro', error.message || 'Erro desconhecido', 'error');
    }
}