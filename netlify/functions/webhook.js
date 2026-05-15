const { createClient } = require('@supabase/supabase-js');

// Conexão com o Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://iazehdwsnmunglhdtize.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Chave de serviço
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido' };
    }

    try {
        const body = JSON.parse(event.body);

        // Verifica se é uma compra aprovada
        if (body.order_status === 'paid') {
            const emailCliente = body.Customer.email;
            
            // Pega o nome do produto principal
            const nomeProduto = body.Product && body.Product.product_name ? body.Product.product_name.toLowerCase() : '';
            
            // Pega o nome do plano de assinatura (A PEÇA QUE FALTAVA)
            const nomePlano = body.Subscription && body.Subscription.plan && body.Subscription.plan.name ? body.Subscription.plan.name.toLowerCase() : '';

            // Junta os dois nomes para a IA do webhook analisar
            const nomeVerificacao = nomeProduto + " " + nomePlano;

            // A MÁGICA: Descobre qual plano ele comprou analisando o Produto e a Assinatura
            let planoComprado = 'basico'; // Padrão
            
            if (nomeVerificacao.includes('premium')) {
                planoComprado = 'premium';
            } else if (nomeVerificacao.includes('pro')) {
                planoComprado = 'pro';
            }

            // Verifica se o cliente já tem conta
            const { data: perfilExistente } = await supabase
                .from('perfis')
                .select('*')
                .eq('email', emailCliente)
                .single();

            if (perfilExistente) {
                // Atualiza o plano
                await supabase
                    .from('perfis')
                    .update({ plano: planoComprado })
                    .eq('email', emailCliente);
            } else {
                // Cria conta nova com o plano correto
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
