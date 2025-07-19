/*
  # Inserir 108 alunos fictícios

  1. Dados Realistas
    - Nomes brasileiros completos e variados
    - Emails profissionais únicos
    - WhatsApp formatado no padrão brasileiro
    - Empresas diversas do setor de tecnologia
    - Horários variados para diferentes cenários

  2. Distribuição de Horários
    - Manhã: 25 alunos
    - Tarde: 20 alunos
    - Noite: 30 alunos
    - Manhã + Tarde: 15 alunos
    - Tarde + Noite: 10 alunos
    - Manhã + Noite: 5 alunos
    - Todos os horários: 3 alunos

  3. Empresas Fictícias
    - Variadas empresas de tecnologia e inovação
*/

INSERT INTO alunos (nome, email, whatsapp, empresa, available_periods) VALUES
-- Só Manhã (25 alunos)
('Ana Carolina Silva', 'ana.silva@techcorp.com.br', '(11) 99888-7701', 'TechCorp Solutions', ARRAY['manha']::period_type[]),
('Bruno Henrique Santos', 'bruno.santos@inovacao.com.br', '(11) 99888-7702', 'Inovação Digital', ARRAY['manha']::period_type[]),
('Camila Rodrigues Lima', 'camila.lima@startup.com.br', '(11) 99888-7703', 'StartUp Innovations', ARRAY['manha']::period_type[]),
('Daniel Ferreira Costa', 'daniel.costa@devhouse.com.br', '(11) 99888-7704', 'DevHouse', ARRAY['manha']::period_type[]),
('Eduarda Almeida Souza', 'eduarda.souza@cloudtech.com.br', '(11) 99888-7705', 'CloudTech', ARRAY['manha']::period_type[]),
('Felipe Oliveira Pereira', 'felipe.pereira@datalab.com.br', '(11) 99888-7706', 'DataLab Analytics', ARRAY['manha']::period_type[]),
('Gabriela Martins Rocha', 'gabriela.rocha@aicompany.com.br', '(11) 99888-7707', 'AI Company', ARRAY['manha']::period_type[]),
('Henrique Barbosa Dias', 'henrique.dias@cybersec.com.br', '(11) 99888-7708', 'CyberSec Pro', ARRAY['manha']::period_type[]),
('Isabela Carvalho Nunes', 'isabela.nunes@webdev.com.br', '(11) 99888-7709', 'WebDev Studio', ARRAY['manha']::period_type[]),
('João Pedro Araújo', 'joao.araujo@mobileapps.com.br', '(11) 99888-7710', 'Mobile Apps Inc', ARRAY['manha']::period_type[]),
('Larissa Fernandes Gomes', 'larissa.gomes@blockchain.com.br', '(11) 99888-7711', 'Blockchain Solutions', ARRAY['manha']::period_type[]),
('Mateus Ribeiro Castro', 'mateus.castro@uxdesign.com.br', '(11) 99888-7712', 'UX Design Co', ARRAY['manha']::period_type[]),
('Natália Sousa Moreira', 'natalia.moreira@gamedev.com.br', '(11) 99888-7713', 'GameDev Studios', ARRAY['manha']::period_type[]),
('Otávio Cardoso Freitas', 'otavio.freitas@fintech.com.br', '(11) 99888-7714', 'FinTech Innovations', ARRAY['manha']::period_type[]),
('Priscila Monteiro Lopes', 'priscila.lopes@robotics.com.br', '(11) 99888-7715', 'Robotics Lab', ARRAY['manha']::period_type[]),
('Rafael Correia Vieira', 'rafael.vieira@ecommerce.com.br', '(11) 99888-7716', 'E-commerce Plus', ARRAY['manha']::period_type[]),
('Sabrina Torres Mendes', 'sabrina.mendes@iot.com.br', '(11) 99888-7717', 'IoT Technologies', ARRAY['manha']::period_type[]),
('Thiago Nascimento Cruz', 'thiago.cruz@quantum.com.br', '(11) 99888-7718', 'Quantum Computing', ARRAY['manha']::period_type[]),
('Vanessa Pinto Ramos', 'vanessa.ramos@digitalsys.com.br', '(11) 99888-7719', 'Digital Systems', ARRAY['manha']::period_type[]),
('William Teixeira Campos', 'william.campos@smarttech.com.br', '(11) 99888-7720', 'SmartTech', ARRAY['manha']::period_type[]),
('Yasmin Cavalcanti Reis', 'yasmin.reis@nexusdev.com.br', '(11) 99888-7721', 'Nexus Development', ARRAY['manha']::period_type[]),
('Zeca Moura Batista', 'zeca.batista@pixelart.com.br', '(11) 99888-7722', 'Pixel Art Studio', ARRAY['manha']::period_type[]),
('Amanda Vasconcelos Silva', 'amanda.silva@codelab.com.br', '(11) 99888-7723', 'Code Laboratory', ARRAY['manha']::period_type[]),
('Bernardo Macedo Santos', 'bernardo.santos@techwave.com.br', '(11) 99888-7724', 'TechWave Solutions', ARRAY['manha']::period_type[]),
('Cristiane Borges Lima', 'cristiane.lima@innovate.com.br', '(11) 99888-7725', 'Innovate Hub', ARRAY['manha']::period_type[]),

-- Só Tarde (20 alunos)
('Diego Farias Costa', 'diego.costa@afternoon.com.br', '(11) 99888-7726', 'Afternoon Tech', ARRAY['tarde']::period_type[]),
('Elaine Guimarães Souza', 'elaine.souza@midday.com.br', '(11) 99888-7727', 'Midday Solutions', ARRAY['tarde']::period_type[]),
('Fábio Melo Pereira', 'fabio.pereira@suntech.com.br', '(11) 99888-7728', 'SunTech Corp', ARRAY['tarde']::period_type[]),
('Giovana Azevedo Rocha', 'giovana.rocha@daylight.com.br', '(11) 99888-7729', 'Daylight Systems', ARRAY['tarde']::period_type[]),
('Hugo Sampaio Dias', 'hugo.dias@brightcode.com.br', '(11) 99888-7730', 'BrightCode Studio', ARRAY['tarde']::period_type[]),
('Ingrid Leal Nunes', 'ingrid.nunes@solardev.com.br', '(11) 99888-7731', 'Solar Development', ARRAY['tarde']::period_type[]),
('Júlio César Araújo', 'julio.araujo@lighttech.com.br', '(11) 99888-7732', 'LightTech Solutions', ARRAY['tarde']::period_type[]),
('Karina Duarte Gomes', 'karina.gomes@zenith.com.br', '(11) 99888-7733', 'Zenith Technologies', ARRAY['tarde']::period_type[]),
('Leonardo Reis Castro', 'leonardo.castro@meridian.com.br', '(11) 99888-7734', 'Meridian Systems', ARRAY['tarde']::period_type[]),
('Mariana Cunha Moreira', 'mariana.moreira@apex.com.br', '(11) 99888-7735', 'Apex Development', ARRAY['tarde']::period_type[]),
('Nicolas Barros Freitas', 'nicolas.freitas@peak.com.br', '(11) 99888-7736', 'Peak Technologies', ARRAY['tarde']::period_type[]),
('Olívia Campos Lopes', 'olivia.lopes@summit.com.br', '(11) 99888-7737', 'Summit Solutions', ARRAY['tarde']::period_type[]),
('Paulo Henrique Vieira', 'paulo.vieira@vertex.com.br', '(11) 99888-7738', 'Vertex Systems', ARRAY['tarde']::period_type[]),
('Quésia Alves Mendes', 'quesia.mendes@pinnacle.com.br', '(11) 99888-7739', 'Pinnacle Tech', ARRAY['tarde']::period_type[]),
('Rodrigo Silva Cruz', 'rodrigo.cruz@crest.com.br', '(11) 99888-7740', 'Crest Development', ARRAY['tarde']::period_type[]),
('Simone Tavares Ramos', 'simone.ramos@crown.com.br', '(11) 99888-7741', 'Crown Technologies', ARRAY['tarde']::period_type[]),
('Túlio Medeiros Campos', 'tulio.campos@royal.com.br', '(11) 99888-7742', 'Royal Systems', ARRAY['tarde']::period_type[]),
('Úrsula Pacheco Reis', 'ursula.reis@elite.com.br', '(11) 99888-7743', 'Elite Solutions', ARRAY['tarde']::period_type[]),
('Vinícius Moraes Batista', 'vinicius.batista@prime.com.br', '(11) 99888-7744', 'Prime Technologies', ARRAY['tarde']::period_type[]),
('Wanda Esteves Silva', 'wanda.silva@superior.com.br', '(11) 99888-7745', 'Superior Systems', ARRAY['tarde']::period_type[]),

-- Só Noite (30 alunos)
('Alexandre Nogueira Santos', 'alexandre.santos@nighttech.com.br', '(11) 99888-7746', 'NightTech Solutions', ARRAY['noite']::period_type[]),
('Beatriz Fonseca Lima', 'beatriz.lima@moonlight.com.br', '(11) 99888-7747', 'Moonlight Systems', ARRAY['noite']::period_type[]),
('Carlos Eduardo Costa', 'carlos.costa@starcode.com.br', '(11) 99888-7748', 'StarCode Studio', ARRAY['noite']::period_type[]),
('Débora Machado Souza', 'debora.souza@twilight.com.br', '(11) 99888-7749', 'Twilight Technologies', ARRAY['noite']::period_type[]),
('Eduardo Pinheiro Pereira', 'eduardo.pereira@midnight.com.br', '(11) 99888-7750', 'Midnight Development', ARRAY['noite']::period_type[]),
('Fernanda Queiroz Rocha', 'fernanda.rocha@darkcode.com.br', '(11) 99888-7751', 'DarkCode Solutions', ARRAY['noite']::period_type[]),
('Gustavo Brandão Dias', 'gustavo.dias@shadow.com.br', '(11) 99888-7752', 'Shadow Systems', ARRAY['noite']::period_type[]),
('Helena Vargas Nunes', 'helena.nunes@eclipse.com.br', '(11) 99888-7753', 'Eclipse Technologies', ARRAY['noite']::period_type[]),
('Igor Siqueira Araújo', 'igor.araujo@lunar.com.br', '(11) 99888-7754', 'Lunar Development', ARRAY['noite']::period_type[]),
('Jéssica Andrade Gomes', 'jessica.gomes@stellar.com.br', '(11) 99888-7755', 'Stellar Solutions', ARRAY['noite']::period_type[]),
('Kevin Lopes Castro', 'kevin.castro@cosmic.com.br', '(11) 99888-7756', 'Cosmic Systems', ARRAY['noite']::period_type[]),
('Letícia Brito Moreira', 'leticia.moreira@galaxy.com.br', '(11) 99888-7757', 'Galaxy Technologies', ARRAY['noite']::period_type[]),
('Marcelo Rocha Freitas', 'marcelo.freitas@nebula.com.br', '(11) 99888-7758', 'Nebula Development', ARRAY['noite']::period_type[]),
('Nayara Coelho Lopes', 'nayara.lopes@constellation.com.br', '(11) 99888-7759', 'Constellation Tech', ARRAY['noite']::period_type[]),
('Orlando Ferraz Vieira', 'orlando.vieira@orbit.com.br', '(11) 99888-7760', 'Orbit Solutions', ARRAY['noite']::period_type[]),
('Patrícia Goulart Mendes', 'patricia.mendes@planet.com.br', '(11) 99888-7761', 'Planet Systems', ARRAY['noite']::period_type[]),
('Quintino Ribas Cruz', 'quintino.cruz@universe.com.br', '(11) 99888-7762', 'Universe Technologies', ARRAY['noite']::period_type[]),
('Renata Caldas Ramos', 'renata.ramos@infinity.com.br', '(11) 99888-7763', 'Infinity Development', ARRAY['noite']::period_type[]),
('Sérgio Matos Campos', 'sergio.campos@eternity.com.br', '(11) 99888-7764', 'Eternity Solutions', ARRAY['noite']::period_type[]),
('Tatiana Veloso Reis', 'tatiana.reis@beyond.com.br', '(11) 99888-7765', 'Beyond Systems', ARRAY['noite']::period_type[]),
('Ulisses Paiva Batista', 'ulisses.batista@dimension.com.br', '(11) 99888-7766', 'Dimension Tech', ARRAY['noite']::period_type[]),
('Valéria Cunha Silva', 'valeria.silva@matrix.com.br', '(11) 99888-7767', 'Matrix Solutions', ARRAY['noite']::period_type[]),
('Wagner Leite Santos', 'wagner.santos@vector.com.br', '(11) 99888-7768', 'Vector Systems', ARRAY['noite']::period_type[]),
('Ximena Borba Lima', 'ximena.lima@quantum.com.br', '(11) 99888-7769', 'Quantum Development', ARRAY['noite']::period_type[]),
('Yago Freire Costa', 'yago.costa@parallel.com.br', '(11) 99888-7770', 'Parallel Technologies', ARRAY['noite']::period_type[]),
('Zilda Neves Souza', 'zilda.souza@virtual.com.br', '(11) 99888-7771', 'Virtual Solutions', ARRAY['noite']::period_type[]),
('André Luís Pereira', 'andre.pereira@digital.com.br', '(11) 99888-7772', 'Digital Realm', ARRAY['noite']::period_type[]),
('Bruna Cavalcante Rocha', 'bruna.rocha@cyber.com.br', '(11) 99888-7773', 'Cyber Space', ARRAY['noite']::period_type[]),
('César Augusto Dias', 'cesar.dias@neural.com.br', '(11) 99888-7774', 'Neural Networks', ARRAY['noite']::period_type[]),
('Denise Moura Nunes', 'denise.nunes@binary.com.br', '(11) 99888-7775', 'Binary Systems', ARRAY['noite']::period_type[]),

-- Manhã + Tarde (15 alunos)
('Everton Silva Araújo', 'everton.araujo@dayshift.com.br', '(11) 99888-7776', 'DayShift Technologies', ARRAY['manha', 'tarde']::period_type[]),
('Fabiana Costa Gomes', 'fabiana.gomes@sunmoon.com.br', '(11) 99888-7777', 'SunMoon Solutions', ARRAY['manha', 'tarde']::period_type[]),
('Gilberto Alves Castro', 'gilberto.castro@dualtime.com.br', '(11) 99888-7778', 'DualTime Systems', ARRAY['manha', 'tarde']::period_type[]),
('Heloísa Ramos Moreira', 'heloisa.moreira@flexible.com.br', '(11) 99888-7779', 'Flexible Development', ARRAY['manha', 'tarde']::period_type[]),
('Ivan Cardoso Freitas', 'ivan.freitas@adaptive.com.br', '(11) 99888-7780', 'Adaptive Technologies', ARRAY['manha', 'tarde']::period_type[]),
('Janaína Lopes Lopes', 'janaina.lopes@versatile.com.br', '(11) 99888-7781', 'Versatile Solutions', ARRAY['manha', 'tarde']::period_type[]),
('Klaus Vieira Vieira', 'klaus.vieira@dynamic.com.br', '(11) 99888-7782', 'Dynamic Systems', ARRAY['manha', 'tarde']::period_type[]),
('Luciana Mendes Mendes', 'luciana.mendes@agile.com.br', '(11) 99888-7783', 'Agile Development', ARRAY['manha', 'tarde']::period_type[]),
('Márcio Cruz Cruz', 'marcio.cruz@swift.com.br', '(11) 99888-7784', 'Swift Technologies', ARRAY['manha', 'tarde']::period_type[]),
('Neusa Ramos Ramos', 'neusa.ramos@rapid.com.br', '(11) 99888-7785', 'Rapid Solutions', ARRAY['manha', 'tarde']::period_type[]),
('Osvaldo Campos Campos', 'osvaldo.campos@quick.com.br', '(11) 99888-7786', 'Quick Systems', ARRAY['manha', 'tarde']::period_type[]),
('Poliana Reis Reis', 'poliana.reis@fast.com.br', '(11) 99888-7787', 'Fast Development', ARRAY['manha', 'tarde']::period_type[]),
('Quirino Batista Batista', 'quirino.batista@speed.com.br', '(11) 99888-7788', 'Speed Technologies', ARRAY['manha', 'tarde']::period_type[]),
('Rosana Silva Silva', 'rosana.silva@turbo.com.br', '(11) 99888-7789', 'Turbo Solutions', ARRAY['manha', 'tarde']::period_type[]),
('Silvio Santos Santos', 'silvio.santos@boost.com.br', '(11) 99888-7790', 'Boost Systems', ARRAY['manha', 'tarde']::period_type[]),

-- Tarde + Noite (10 alunos)
('Telma Lima Lima', 'telma.lima@evening.com.br', '(11) 99888-7791', 'Evening Technologies', ARRAY['tarde', 'noite']::period_type[]),
('Ubiratan Costa Costa', 'ubiratan.costa@dusk.com.br', '(11) 99888-7792', 'Dusk Solutions', ARRAY['tarde', 'noite']::period_type[]),
('Viviane Souza Souza', 'viviane.souza@sunset.com.br', '(11) 99888-7793', 'Sunset Systems', ARRAY['tarde', 'noite']::period_type[]),
('Wesley Pereira Pereira', 'wesley.pereira@nightfall.com.br', '(11) 99888-7794', 'Nightfall Development', ARRAY['tarde', 'noite']::period_type[]),
('Yone Rocha Rocha', 'yone.rocha@afterhours.com.br', '(11) 99888-7795', 'AfterHours Technologies', ARRAY['tarde', 'noite']::period_type[]),
('Zuleika Dias Dias', 'zuleika.dias@lateshift.com.br', '(11) 99888-7796', 'LateShift Solutions', ARRAY['tarde', 'noite']::period_type[]),
('Ademir Nunes Nunes', 'ademir.nunes@twilightzone.com.br', '(11) 99888-7797', 'TwiLight Zone Systems', ARRAY['tarde', 'noite']::period_type[]),
('Benedita Araújo Araújo', 'benedita.araujo@nighttime.com.br', '(11) 99888-7798', 'NightTime Development', ARRAY['tarde', 'noite']::period_type[]),
('Cláudio Gomes Gomes', 'claudio.gomes@moonrise.com.br', '(11) 99888-7799', 'MoonRise Technologies', ARRAY['tarde', 'noite']::period_type[]),
('Dalva Castro Castro', 'dalva.castro@starlight.com.br', '(11) 99888-7800', 'StarLight Solutions', ARRAY['tarde', 'noite']::period_type[]),

-- Manhã + Noite (5 alunos)
('Edmundo Moreira Moreira', 'edmundo.moreira@earlynight.com.br', '(11) 99888-7801', 'EarlyNight Systems', ARRAY['manha', 'noite']::period_type[]),
('Fátima Freitas Freitas', 'fatima.freitas@dawnmoon.com.br', '(11) 99888-7802', 'DawnMoon Technologies', ARRAY['manha', 'noite']::period_type[]),
('Geraldo Lopes Lopes', 'geraldo.lopes@sunrise.com.br', '(11) 99888-7803', 'SunRise Solutions', ARRAY['manha', 'noite']::period_type[]),
('Hilda Vieira Vieira', 'hilda.vieira@daynight.com.br', '(11) 99888-7804', 'DayNight Development', ARRAY['manha', 'noite']::period_type[]),
('Ivo Mendes Mendes', 'ivo.mendes@extremes.com.br', '(11) 99888-7805', 'Extremes Technologies', ARRAY['manha', 'noite']::period_type[]),

-- Todos os horários (3 alunos)
('Joselito Cruz Cruz', 'joselito.cruz@alltime.com.br', '(11) 99888-7806', 'AllTime Solutions', ARRAY['manha', 'tarde', 'noite']::period_type[]),
('Kátia Ramos Ramos', 'katia.ramos@fulltime.com.br', '(11) 99888-7807', 'FullTime Systems', ARRAY['manha', 'tarde', 'noite']::period_type[]),
('Laércio Campos Campos', 'laercio.campos@anytime.com.br', '(11) 99888-7808', 'AnyTime Development', ARRAY['manha', 'tarde', 'noite']::period_type[]);