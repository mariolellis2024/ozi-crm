/*
  # Inserir 18 alunos fictícios

  1. Novos Registros
    - 18 alunos com dados fictícios realistas
    - Nomes brasileiros variados
    - WhatsApp com formato brasileiro
    - Emails únicos
    - Empresas diversas
    - Horários disponíveis aleatórios

  2. Dados Incluídos
    - Nome completo
    - Email profissional
    - WhatsApp formatado
    - Empresa de atuação
    - Períodos disponíveis (manhã, tarde, noite)
*/

INSERT INTO alunos (nome, email, whatsapp, empresa, available_periods) VALUES
('Lucas Mendes', 'lucas.mendes@techcorp.com', '(11) 99888-7701', 'TechCorp Solutions', ARRAY['manha', 'tarde']::period_type[]),
('Beatriz Santos', 'beatriz.santos@inovacao.com', '(11) 99888-7702', 'Inovação Digital', ARRAY['noite']::period_type[]),
('Rafael Costa', 'rafael.costa@startup.io', '(11) 99888-7703', 'StartUp Innovations', ARRAY['manha']::period_type[]),
('Amanda Silva', 'amanda.silva@devhouse.com', '(11) 99888-7704', 'DevHouse', ARRAY['tarde', 'noite']::period_type[]),
('Gabriel Rodrigues', 'gabriel.rodrigues@cloudtech.com', '(11) 99888-7705', 'CloudTech', ARRAY[]::period_type[]),
('Larissa Oliveira', 'larissa.oliveira@datalab.com', '(11) 99888-7706', 'DataLab Analytics', ARRAY['manha', 'tarde', 'noite']::period_type[]),
('Thiago Almeida', 'thiago.almeida@aicompany.com', '(11) 99888-7707', 'AI Company', ARRAY['tarde']::period_type[]),
('Isabela Ferreira', 'isabela.ferreira@cybersec.com', '(11) 99888-7708', 'CyberSec Pro', ARRAY['noite']::period_type[]),
('Mateus Lima', 'mateus.lima@webdev.com', '(11) 99888-7709', 'WebDev Studio', ARRAY['manha']::period_type[]),
('Carolina Martins', 'carolina.martins@mobile.app', '(11) 99888-7710', 'Mobile Apps Inc', ARRAY['tarde', 'noite']::period_type[]),
('Diego Pereira', 'diego.pereira@blockchain.io', '(11) 99888-7711', 'Blockchain Solutions', ARRAY['manha', 'tarde']::period_type[]),
('Natália Rocha', 'natalia.rocha@uxdesign.com', '(11) 99888-7712', 'UX Design Co', ARRAY[]::period_type[]),
('Felipe Barbosa', 'felipe.barbosa@gamedev.com', '(11) 99888-7713', 'GameDev Studios', ARRAY['noite']::period_type[]),
('Mariana Souza', 'mariana.souza@fintech.com', '(11) 99888-7714', 'FinTech Innovations', ARRAY['manha']::period_type[]),
('André Carvalho', 'andre.carvalho@robotics.com', '(11) 99888-7715', 'Robotics Lab', ARRAY['tarde']::period_type[]),
('Priscila Dias', 'priscila.dias@ecommerce.com', '(11) 99888-7716', 'E-commerce Plus', ARRAY['manha', 'noite']::period_type[]),
('Rodrigo Nascimento', 'rodrigo.nascimento@iot.tech', '(11) 99888-7717', 'IoT Technologies', ARRAY['tarde', 'noite']::period_type[]),
('Vanessa Campos', 'vanessa.campos@quantum.com', '(11) 99888-7718', 'Quantum Computing', ARRAY['manha', 'tarde', 'noite']::period_type[]);