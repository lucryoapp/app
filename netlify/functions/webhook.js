const { createClient } = require('@supabase/supabase-js');

// Conexão com o Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://iazehdwsnmunglhdtize.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Chave de serviço (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
    // Apenas aceita requisições POST (que é o que a Kiwify manda)
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido' };
    }

    try {
        // Lê os dados que a Kiwify enviou
        const body = JSON.parse(event.body);

        // Verifica se é um aviso de COMPRA APROVADA
        if (body.order_status === 'paid') {
            const emailCliente = body.Customer.email;
            
            // Pega o nome do produto exatamente como está escrito na Kiwify
            const nomeProduto = body.Product.product_name.toLowerCase();

            // A MÁGICA ACONTECE AQUI: Descobre qual plano ele comprou
            let planoComprado = 'basico'; // Plano padrão
            
            if (nomeProduto.includes('premium')) {
                planoComprado = 'premium';
            } else if (nomeProduto.includes('pro')) {
                planoComprado = 'pro';
            }

            // 1. Verifica se o cliente já tem conta na tabela 'perfis'
            const { data: perfilExistente } = await supabase
                .from('perfis')
                .select('*')
                .eq('email', emailCliente)
                .single();

            if (perfilExistente) {
                // SE ELE JÁ EXISTE: Apenas atualiza o plano dele para o novo que ele comprou
                await supabase
                    .from('perfis')
                    .update({ plano: planoComprado })
                    .eq('email', emailCliente);
            } else {
                // SE ELE NÃO EXISTE (Comprou antes de criar conta no site):
                // Cria um perfil novo já com o plano Premium/Pro ativado
                await supabase
                    .from('perfis')
                    .insert([{ email: emailCliente, plano: planoComprado }]);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Webhook processado com sucesso!' })
        };

    } catch (error) {
        console.error('Erro no webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno no servidor' })
        };
    }
};
