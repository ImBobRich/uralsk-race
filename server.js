<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>СОЛЛАЛЬ 2026</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        body { margin: 0; background: #000; font-family: 'Arial Black', sans-serif; color: white; overflow: hidden; touch-action: none; }
        .page { display: none; width: 100vw; height: 100vh; position: fixed; top: 0; left: 0; box-sizing: border-box; }
        
        /* ГЛАВНЫЙ ЭКРАН ТВ */
        #lobby { 
            flex-direction: column; align-items: center; justify-content: center; 
            background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1598902108854-10e335adac99?q=80&w=2070&auto=format&fit=crop');
            background-size: cover; background-position: center;
        }
        .header-title { text-align: center; margin-bottom: 40px; }
        .header-title h1 { font-size: 6rem; color: #fff; margin: 0; -webkit-text-stroke: 2px gold; text-shadow: 0 0 20px #ff4500; }
        .header-title h2 { font-size: 3.5rem; color: gold; margin: 0; }

        .main-row { display: flex; align-items: center; justify-content: center; gap: 80px; width: 90%; }
        .qr-wrap { background: white; padding: 20px; border-radius: 25px; border: 12px solid gold; }
        .plate { background: rgba(0,0,0,0.85); padding: 40px; border: 4px solid gold; border-radius: 30px; min-width: 450px; }

        /* ИГРОВОЕ ПОЛЕ С ШАХМАТКОЙ */
        #stadium { background: #1a3c15; flex-direction: column; }
        .lane { 
            flex: 1; 
            border-bottom: 2px solid rgba(255,255,255,0.2); 
            position: relative; 
            display: flex; 
            align-items: center;
            /* Рисуем шахматку в конце дорожки */
            background-image: repeating-conic-gradient(#fff 0% 25%, #000 0% 50%);
            background-position: right center;
            background-size: 40px 40px;
            background-repeat: repeat-y;
        }
        
        .horse { position: absolute; left: 0; transition: left 0.1s linear; display: flex; align-items: center; z-index: 10; }
        .horse-img { font-size: 5rem; transform: scaleX(-1); animation: gallop 0.5s infinite ease-in-out; }
        
        @keyframes gallop { 
            0%, 100% { transform: translateY(0) scaleX(-1); } 
            50% { transform: translateY(-20px) scaleX(-1); } 
        }
        
        .horse-label { background: #fff; color: #000; padding: 5px 15px; border-radius: 10px; font-weight: bold; font-size: 1.5rem; border: 3px solid #000; margin-left: -20px; }

        #stats-bar { height: 120px; background: #000; border-top: 5px solid gold; display: flex; justify-content: space-around; align-items: center; }
        .stat-item { background: #222; padding: 10px 20px; border-radius: 10px; border: 1px solid gold; text-align: center; }

        /* МОБИЛКА */
        #mobile { background: #1b5e20; text-align: center; padding: 20px; }
        .table-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .t-btn { padding: 30px 10px; background: #fff; color: #000; border-radius: 15px; font-weight: bold; font-size: 1.4rem; border: 5px solid transparent; }
        .t-btn.active { border-color: gold; background: #ffeb3b; }
        .t-btn.full { background: #444; color: #777; pointer-events: none; opacity: 0.5; }
        .m-in { width: 100%; padding: 20px; margin-bottom: 20px; font-size: 1.3rem; border-radius: 15px; border: none; text-align: center; box-sizing: border-box; }
        .m-btn { width: 100%; padding: 25px; background: gold; font-weight: bold; font-size: 2rem; border-radius: 20px; border: none; color: #000; }

        #shake-screen { flex-direction: column; align-items: center; justify-content: center; }
        #shake-screen h1 { font-size: 6rem; color: gold; margin: 20px 0; animation: pulse 0.4s infinite alternate; }
        @keyframes pulse { from { transform: scale(1); } to { transform: scale(1.1); } }

        /* ФИНАЛ */
        #victory-screen { background: rgba(0,0,0,0.95); z-index: 100; flex-direction: column; align-items: center; justify-content: center; }
        canvas { position: absolute; top: 0; left: 0; pointer-events: none; }
    </style>
</head>
<body>
    <audio id="fanfare" src="https://actions.google.com/sounds/v1/human_voices/applause_clapping_and_cheering.ogg"></audio>

    <div id="lobby" class="page">
        <div class="header-title"><h1>СОЛЛАЛЬ 2026</h1><h2>УРАЛЬСКИЕ СКАЧКИ</h2></div>
        <div class="main-row">
            <div class="qr-wrap"><div id="qrcode"></div></div>
            <div class="plate">
                <h2 style="color:gold;">РЕГИСТРАЦИЯ:</h2>
                <ol style="font-size: 1.8rem; line-height: 2; padding-left: 25px; text-align: left;">
                    <li>Выбери номер стола</li>
                    <li>Введи название команды</li>
                    <li>Тряси телефон по сигналу!</li>
                </ol>
            </div>
        </div>
        <div id="team-list" style="margin-top: 30px; display: flex; gap: 15px; justify-content: center;"></div>
    </div>

    <div id="stadium" class="page">
        <div id="race-field" style="flex: 1; display: flex; flex-direction: column;"></div>
        <div id="stats-bar"></div>
        <div id="cnt" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 20rem; color: gold; display: none;">5</div>
    </div>

    <div id="victory-screen" class="page">
        <canvas id="fireworks"></canvas>
        <h1 style="color:red; font-size:12rem; margin:0; z-index: 101; text-shadow: 0 0 30px red;">ФИНИШ</h1>
        <h2 style="font-size:4rem; z-index: 101; color: white;">Победила команда: <span id="win-name" style="color:gold;"></span></h2>
        <div id="admin-reset-btn" style="z-index: 102; margin-top: 40px;"></div>
    </div>

    <div id="mobile" class="page">
        <div id="m-setup">
            <h2 style="color:gold; font-size: 2.2rem;">ВЫБЕРИ СТОЛ</h2>
            <div id="table-selection" class="table-grid"></div>
            <input type="text" id="m-name" class="m-in" placeholder="Имя команды">
            <button onclick="requestPermissionAndJoin()" class="m-btn">ПОДКЛЮЧИТЬСЯ</button>
        </div>
        <div id="shake-screen" class="page">
            <h1>ТРЯСИ!</h1>
            <div style="font-size: 12rem;">🏇</div>
            <p style="color: #fff; font-size: 1.5rem;">ЭКРАН ЗАФИКСИРОВАН</p>
        </div>
    </div>

    <div id="admin-screen" class="page" style="background: #222; padding: 30px;">
        <h2 style="color:gold">УПРАВЛЕНИЕ</h2>
        <div style="background: #333; padding: 20px; border-radius: 15px; margin-bottom: 20px;">
            Столов: <input type="number" id="adm-c" value="7" style="width:60px; font-size: 1.2rem;"> 
            Макс. игроков: <input type="number" id="adm-l" value="3" style="width:60px; font-size: 1.2rem;">
            <button onclick="socket.emit('adminConfig', {totalTables: document.getElementById('adm-c').value, maxPlayers: document.getElementById('adm-l').value})">OK</button>
        </div>
        <button id="start-btn" onclick="socket.emit('adminStartCountdown')" style="width:100%; padding:40px; background:gray; color:white; font-size:2rem; border-radius:20px; border:none;" disabled>ЖДЕМ ИГРОКОВ</button>
