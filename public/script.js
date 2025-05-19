// =============================================
// Variáveis Globais e Constantes
// =============================================
let currentFilter = 'all';
let currentIndex = 0;
let searchTimeout;
const API_ENDPOINTS = {
    presencas: '/salvar-presenca',
    reservas: '/salvar-reserva'
};

// =============================================
// Funções Principais
// =============================================

// Contagem Regressiva
function updateCountdown() {
    const eventDate = new Date('2025-07-19T12:00:00');
    const now = new Date();
    const diff = eventDate - now;

    if (diff <= 0) {
        document.getElementById('countdown').innerHTML = `
            <div class="evento-hoje">
                <h3>É hoje! ❤️</h3>
                <p>Nos vemos em breve!</p>
            </div>
        `;
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

// Carrossel de Imagens
function moveCarousel(step) {
    const images = document.querySelectorAll('.image-item');
    const totalImages = images.length;
    currentIndex = (currentIndex + step + totalImages) % totalImages;
    
    document.querySelector('.carousel-wrapper').style.transform = 
        `translateX(-${currentIndex * 100}%)`;
}

// Sistema de Presentes
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

// Renderização de cada presente
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
    </div>
`;
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
                ${reservado ? 'Indisponível' : 'Reservar Presente'}
            </button>
        </div>
    `;
}

// Mostrar chave PIX
function mostrarChavePix(chave) {
    Swal.fire({
        title: 'Chave PIX',
        html: `
            <div class="pix-container">
                <input type="text" id="pix-chave" value="${chave}" readonly>
                <button onclick="copiarChavePix()" class="botao-copiar">
                    📋 Copiar
                </button>
            </div>
        `,
        showConfirmButton: false,
        background: 'var(--color-background)'
    });
}

// Copiar chave PIX
function copiarChavePix() {
    const chave = document.getElementById('pix-chave').value;
    navigator.clipboard.writeText(chave);
    Swal.fire('✅ Copiado!', 'Chave PIX na área de transferência', 'success');
}

// Confirmação de Presença
async function handleConfirmacaoPresenca(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span class="spinner"></span>
            Confirmando...
        `;

        const { nomePrincipal, membros } = validarFormularioPresenca();

        const response = await fetch(API_ENDPOINTS.presencas, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nomePrincipal,
                membros: membros.filter(m => m.nome)
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro na resposta do servidor');
        }

        await mostrarConfirmacaoSucesso(nomePrincipal, membros.length);
        resetarFormularioPresenca();

    } catch (error) {
        mostrarErroConfirmacao(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar Presença';
    }
}

// =============================================
// Funções para Lista de Presentes
// =============================================

function filtrarPresentes(filtro) {
    currentFilter = filtro;
    const itens = document.querySelectorAll('.presente-item-premium');
    
    itens.forEach(item => {
        const isPix = item.classList.contains('pix-item');
        const isReservado = item.classList.contains('reservado');
        
        if(isPix) {
            item.style.display = 'block'; // Oculta itens PIX dos filtros
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

// =============================================
// Funções Auxiliares
// =============================================

function validarFormularioPresenca() {
    const nomePrincipal = document.getElementById('nomePrincipal').value.trim();
    const membros = Array.from(document.querySelectorAll('.membro-item')).map(item => ({
        nome: item.querySelector('input').value.trim(),
        parentesco: item.querySelector('select').value
    }));

    if (!nomePrincipal) throw new Error('Por favor, insira seu nome completo');
    if (membros.every(m => !m.nome)) throw new Error('Adicione pelo menos um acompanhante');
    
    return { nomePrincipal, membros };
}

async function mostrarConfirmacaoSucesso(nome, qtdAcompanhantes) {
    await Swal.fire({
        title: '🎉 Confirmação Realizada!',
        html: `
            <div class="confirmacao-sucesso">
                <p>Olá, <strong>${nome}</strong>!</p>
                <p>Sua presença e de <strong>${qtdAcompanhantes} acompanhante(s)</strong></p>
                <p>foram confirmadas com sucesso!</p>
                <div class="detalhes-confirmacao">
                    <small>${new Date().toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</small>
                </div>
            </div>
        `,
        icon: 'success',
        showConfirmButton: false,
        timer: 5000,
        background: 'var(--color-background)',
        customClass: {
            popup: 'custom-swal-popup',
            title: 'titulo-sucesso'
        }
    });
}

function resetarFormularioPresenca() {
    document.getElementById('formConfirmacao').reset();
    document.getElementById('membrosFamilia').innerHTML = `
        <div class="membro-item">
            <div class="grupo-input">
                <input type="text" placeholder="Nome do familiar" required>
            </div>
            <div class="grupo-input">
                <select>
                    <option value="companheiro">Cônjuge</option>
                    <option value="filho">Filho(a)</option>
                    <option value="irmao">Irmão(ã)</option>
                    <option value="pai">Pai/Mãe</option>
                    <option value="outro">Outro</option>
                </select>
            </div>
        </div>
    `;
}

function mostrarErroConfirmacao(error) {
    Swal.fire({
        title: '😕 Ops... Algo deu errado!',
        html: `
            <div class="erro-confirmacao">
                <p>${error.message}</p>
                <small>Tente novamente ou entre em contato</small>
            </div>
        `,
        icon: 'error',
        confirmButtonText: 'Entendi',
        background: 'var(--color-background)',
        customClass: {
            popup: 'custom-swal-popup',
            title: 'titulo-erro'
        }
    });
}

// =============================================
// Funções de Membros Familiares
// =============================================

function adicionarMembro() {
    const container = document.getElementById('membrosFamilia');
    
    const novoMembro = document.createElement('div');
    novoMembro.className = 'membro-item';
    novoMembro.innerHTML = `
        <div class="grupo-input">
            <input type="text" placeholder="Nome do familiar" required>
        </div>
        <div class="grupo-input">
            <select>
                <option value="companheiro">Cônjuge</option>
                <option value="filho">Filho(a)</option>
                <option value="irmao">Irmão(ã)</option>
                <option value="pai">Pai/Mãe</option>
                <option value="outro">Outro</option>
            </select>
        </div>
        <button type="button" class="botao-remover" onclick="removerMembro(this)">×</button>
    `;

    container.appendChild(novoMembro);
}

function removerMembro(btn) {
    btn.closest('.membro-item').remove();
    atualizarContadores();
}

// =============================================
// Inicialização e Event Listeners
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    setInterval(updateCountdown, 1000);
    updateCountdown();

    document.getElementById('botao-ver-presentes').addEventListener('click', () => {
        document.getElementById('modal-presentes').style.display = 'flex';
        carregarPresentes();
    });

    document.getElementById('formConfirmacao').addEventListener('submit', handleConfirmacaoPresenca);

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

    document.getElementById('modal-presentes').addEventListener('click', (e) => {
        if (e.target.id === 'modal-presentes' || e.target.classList.contains('fechar')) {
            fecharModal();
        }
    });
});

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

// Carrossel de Fotos
let slideIndex = 0;
const slides = document.querySelectorAll('.slide');

function showSlide(index) {
  const offset = index * -100;
  document.querySelector('.slides').style.transform = `translateX(${offset}%)`;
  slideIndex = index;
}

document.querySelector('.prev').addEventListener('click', () => {
  const newIndex = (slideIndex - 1 + slides.length) % slides.length;
  showSlide(newIndex);
});

document.querySelector('.next').addEventListener('click', () => {
  const newIndex = (slideIndex + 1) % slides.length;
  showSlide(newIndex);
});

showSlide(0);

document.addEventListener('touchmove', function(e) {
    if(e.scale !== 1) e.preventDefault();
  }, { passive: false });

  let touchStartX = 0;

carrossel.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});

carrossel.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].screenX;
  if(Math.abs(diff) > 50) diff > 0 ? nextSlide() : prevSlide();
});