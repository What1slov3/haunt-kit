/*
 * Курированный набор эмодзи (~670 частых) с русскими и английскими ключевыми словами. Модуль грузится
 * только через `import()` из emoji-load.ts — в стартовый чанк приложения не попадает. Строка —
 * `символ шорткод|название|ключевые слова`: компактнее массива объектов в исходнике, разбор — один раз
 * при загрузке. Тона кожи не поддерживаются: базовые символы без модификаторов.
 */

import type { EmojiCategory, EmojiCategoryId } from './emoji-types';

const smileys = `
😀 grinning|ухмылка|smile happy улыбка радость
😃 smiley|улыбка|happy joy радость
😄 smile|смех|happy laugh улыбка радость
😁 grin|широкая улыбка|teeth happy зубы
😆 laughing|хохот|lol laugh смех
😅 sweat_smile|нервный смех|relief phew фух пот
🤣 rofl|катаюсь от смеха|lol laugh ржу
😂 joy|слёзы радости|lol laugh смех ржу
🙂 slight_smile|лёгкая улыбка|smile ок
🙃 upside_down|перевёрнутое лицо|sarcasm ирония
😉 wink|подмигивание|flirt подмигнуть
😊 blush|румянец|smile shy смущение
😇 innocent|ангел|angel halo нимб
🥰 smiling_hearts|влюблённость|love hearts любовь сердечки
😍 heart_eyes|глаза-сердечки|love crush любовь
🤩 star_struck|звёзды в глазах|wow amazing восторг
😘 kissing_heart|воздушный поцелуй|kiss love поцелуй
😗 kissing|поцелуй|kiss чмок
😚 kissing_closed_eyes|поцелуй с закрытыми глазами|kiss чмок
😋 yum|вкусно|tasty delicious вкуснятина
😛 stuck_out_tongue|язык|tongue playful дразнить
😜 winking_tongue|язык и подмигивание|crazy joke шутка
🤪 zany|чудик|crazy wild безумие
😝 squinting_tongue|язык зажмурившись|tongue playful
🤑 money_mouth|деньги|money rich богатство
🤗 hugging|обнимашки|hug обнять
🤭 hand_over_mouth|ой|oops giggle хихи
🤫 shushing|тише|quiet secret тсс секрет
🤔 thinking|задумчивость|hmm think думать хм
🤐 zipper_mouth|рот на замке|secret silent молчу
🤨 raised_eyebrow|бровь|suspicious skeptic подозрение
😐 neutral|нейтрально|meh blank пофиг
😑 expressionless|без эмоций|blank meh
😶 no_mouth|без рта|silent speechless молчание
😏 smirk|самодовольство|smug хитро
😒 unamused|недовольство|meh annoyed скука
🙄 eye_roll|закатить глаза|whatever annoyed
😬 grimacing|гримаса|awkward неловко
😮‍💨 exhaling|выдох|sigh relief фух
🤥 lying|врун|lie pinocchio ложь
😌 relieved|облегчение|calm relief спокойствие
😔 pensive|грусть|sad thoughtful печаль
😪 sleepy|сонный|tired sleep спать
🤤 drooling|слюнки|drool hungry хочу
😴 sleeping|сплю|sleep zzz сон
😷 mask|маска|sick ill болею
🤒 thermometer_face|температура|sick fever болею
🤕 head_bandage|травма|hurt injured бинт
🤢 nauseated|тошнит|sick gross фу
🤮 vomiting|рвота|sick gross фу
🤧 sneezing|чих|sneeze cold простуда
🥵 hot_face|жара|hot heat горячо
🥶 cold_face|холод|cold freezing мороз
🥴 woozy|пьяный|drunk dizzy
😵 dizzy_face|в отключке|dizzy dead
🤯 exploding_head|взрыв мозга|mind blown шок
🤠 cowboy|ковбой|cowboy yeehaw шляпа
🥳 partying|праздник|party celebrate вечеринка
🥸 disguised|маскировка|disguise incognito очки
😎 sunglasses|крутой|cool sunglasses очки
🤓 nerd|ботаник|nerd geek очкарик
🧐 monocle|монокль|curious inspect хм
😕 confused|растерянность|confused unsure
😟 worried|беспокойство|worried nervous тревога
🙁 slight_frown|грустно|sad
☹️ frowning|печаль|sad
😮 open_mouth|удивление|wow surprised ого
😯 hushed|тихое удивление|surprised
😲 astonished|изумление|shocked wow
😳 flushed|смущение|embarrassed blush краснею
🥺 pleading|умоляю|please puppy eyes пожалуйста
🥹 holding_back_tears|сдерживаю слёзы|touched grateful трогательно
😦 frowning_open|разочарование|disappointed
😧 anguished|страдание|anguished
😨 fearful|страх|scared afraid боюсь
😰 anxious_sweat|тревога|nervous anxious
😥 sad_relieved|грусть с облегчением|sad phew
😢 cry|слеза|sad cry плачу
😭 sob|рыдания|cry sad плачу
😱 scream|крик ужаса|scared shock ужас
😖 confounded|мучение|frustrated
😣 persevere|упорство|struggle терплю
😞 disappointed|разочарование|sad
😓 downcast_sweat|устал|tired sweat
😩 weary|изнеможение|tired weary устал
😫 tired_face|усталость|tired exhausted
🥱 yawning|зевок|bored tired скучно
😤 triumph|пар из носа|angry proud злюсь
😡 rage|ярость|angry mad злость
😠 angry|злость|angry mad
🤬 cursing|ругань|swear angry мат
😈 smiling_imp|чертёнок|devil evil дьявол
👿 imp|злой чертёнок|devil angry
💀 skull|череп|dead lol death умер
☠️ skull_crossbones|череп и кости|danger poison опасно
💩 poop|какашка|poo shit
🤡 clown|клоун|clown joke
👹 ogre|они|monster demon монстр
👺 goblin|тэнгу|monster goblin
👻 ghost|призрак|ghost boo haunt привидение
👽 alien|пришелец|alien ufo нло
👾 space_invader|инопланетянин|game alien игра
🤖 robot|робот|robot bot бот
😺 smiley_cat|улыбчивый кот|cat happy кот
😹 joy_cat|кот смеётся|cat lol кот
😻 heart_eyes_cat|влюблённый кот|cat love кот
🙈 see_no_evil|не вижу|monkey shy обезьянка
🙉 hear_no_evil|не слышу|monkey обезьянка
🙊 speak_no_evil|не скажу|monkey secret обезьянка
`;

const people = `
👋 wave|привет|hello hi bye пока помахать
🤚 raised_back_of_hand|ладонь|hand stop рука
✋ raised_hand|стоп|hand stop high five рука
🖖 vulcan|вулканский салют|spock star trek
👌 ok_hand|окей|ok perfect хорошо
🤌 pinched_fingers|щепотка|italian what итальянец
🤏 pinching|чуть-чуть|small tiny немного
✌️ v|победа|peace victory мир
🤞 crossed_fingers|скрестить пальцы|luck hope удача
🤟 love_you|люблю тебя|love rock
🤘 metal|рок|rock metal коза
🤙 call_me|позвони|call shaka звони
👈 point_left|налево|left point палец
👉 point_right|направо|right point палец
👆 point_up|вверх|up point палец
👇 point_down|вниз|down point палец
☝️ index_up|внимание|up one один
👍 thumbsup|нравится|like yes ok лайк класс да
👎 thumbsdown|не нравится|dislike no нет
✊ fist|кулак|fist power сила
👊 punch|удар|punch fist бро
🤛 left_fist|кулак влево|fist bump
🤜 right_fist|кулак вправо|fist bump
👏 clap|аплодисменты|clap bravo браво хлопать
🙌 raised_hands|ура|hooray celebrate праздник
👐 open_hands|открытые ладони|hands hug
🤲 palms_up|ладони вверх|pray please
🤝 handshake|рукопожатие|deal agree сделка договорились
🙏 pray|спасибо|please thanks pray молюсь пожалуйста
✍️ writing_hand|пишу|write note писать
💅 nail_care|маникюр|nails sassy ногти
🤳 selfie|селфи|selfie camera
💪 muscle|сила|strong muscle бицепс мощь
🧠 brain|мозг|brain smart умный
👀 eyes|глаза|look see смотрю
👁️ eye|глаз|eye see
👅 tongue|язык|tongue
👄 lips|губы|mouth lips
🫶 heart_hands|сердце руками|love heart любовь
👶 baby|малыш|baby child ребёнок
🧒 child|ребёнок|kid child
👦 boy|мальчик|boy
👧 girl|девочка|girl
🧑 person|человек|person adult
👨 man|мужчина|man
👩 woman|женщина|woman
🧓 older_person|пожилой|old elder
👴 old_man|дедушка|grandpa old
👵 old_woman|бабушка|grandma old
🧑‍💻 technologist|программист|developer coder dev разработчик
🧑‍🎨 artist|художник|artist designer дизайнер
🧑‍🚀 astronaut|космонавт|astronaut space космос
🧑‍🍳 cook|повар|chef cook
🧑‍🏫 teacher|учитель|teacher
🕵️ detective|детектив|spy detective шпион
💂 guard|гвардеец|guard
🥷 ninja|ниндзя|ninja stealth
🦸 superhero|супергерой|hero super
🦹 supervillain|суперзлодей|villain
🧙 mage|маг|wizard magic волшебник
🧛 vampire|вампир|vampire dracula
🧟 zombie|зомби|zombie undead
🧞 genie|джинн|genie wish
🧜 merperson|русалка|mermaid
🧚 fairy|фея|fairy magic
🤷 shrug|пожимаю плечами|idk whatever не знаю
🤦 facepalm|рукалицо|facepalm ugh
🙋 raising_hand|поднятая рука|hand question вопрос я
🙇 bow|поклон|bow sorry извините
💁 tipping_hand|подсказка|info sassy
🙅 no_gesture|нельзя|no stop нет
🙆 ok_gesture|можно|ok yes да
🏃 runner|бег|run running бегу
🚶 walking|иду|walk пешком
💃 dancer|танец|dance party танцы
🕺 man_dancing|танцор|dance disco
👯 dancers|вечеринка|party bunny
🧘 lotus|медитация|yoga meditate йога
🛀 bath|ванна|bath relax
🛌 in_bed|в постели|sleep bed сон
👪 family|семья|family
💏 couple_kiss|поцелуй пары|kiss couple love
💑 couple_heart|пара|couple love любовь
🗣️ speaking_head|говорю|speak talk голос
👤 silhouette|силуэт|user person
👥 silhouettes|люди|users group группа
`;

const animals = `
🐶 dog|собака|dog puppy пёс щенок
🐱 cat|кошка|cat kitty кот котик
🐭 mouse|мышь|mouse
🐹 hamster|хомяк|hamster
🐰 rabbit|кролик|bunny rabbit заяц
🦊 fox|лиса|fox лисица
🐻 bear|медведь|bear мишка
🐼 panda|панда|panda
🐨 koala|коала|koala
🐯 tiger|тигр|tiger
🦁 lion|лев|lion
🐮 cow|корова|cow
🐷 pig|свинья|pig хрюша
🐸 frog|лягушка|frog жаба
🐵 monkey_face|обезьяна|monkey
🐔 chicken|курица|chicken
🐧 penguin|пингвин|penguin
🐦 bird|птица|bird
🐤 chick|цыплёнок|chick baby
🦆 duck|утка|duck
🦅 eagle|орёл|eagle
🦉 owl|сова|owl night ночь
🦇 bat|летучая мышь|bat night
🐺 wolf|волк|wolf
🐗 boar|кабан|boar
🐴 horse|лошадь|horse
🦄 unicorn|единорог|unicorn magic
🐝 bee|пчела|bee honey мёд
🐛 bug|гусеница|bug caterpillar баг
🦋 butterfly|бабочка|butterfly
🐌 snail|улитка|snail slow медленно
🐞 ladybug|божья коровка|ladybug
🐜 ant|муравей|ant
🕷️ spider|паук|spider
🦂 scorpion|скорпион|scorpion
🐢 turtle|черепаха|turtle slow
🐍 snake|змея|snake python
🦎 lizard|ящерица|lizard
🦖 t_rex|тираннозавр|dinosaur dino динозавр
🦕 sauropod|динозавр|dinosaur dino
🐙 octopus|осьминог|octopus
🦑 squid|кальмар|squid
🦀 crab|краб|crab rust раст
🐡 blowfish|рыба-ёж|fish
🐠 tropical_fish|тропическая рыба|fish
🐟 fish|рыба|fish рыбка
🐬 dolphin|дельфин|dolphin
🐳 whale|кит|whale docker докер
🦈 shark|акула|shark
🐊 crocodile|крокодил|crocodile
🐘 elephant|слон|elephant
🦒 giraffe|жираф|giraffe
🦘 kangaroo|кенгуру|kangaroo
🐪 camel|верблюд|camel
🦔 hedgehog|ёж|hedgehog ёжик
🦥 sloth|ленивец|sloth lazy лень
🦦 otter|выдра|otter
🐾 paw_prints|следы лап|paw pet
🐉 dragon|дракон|dragon
🌵 cactus|кактус|cactus plant
🎄 christmas_tree|ёлка|christmas tree новый год
🌲 evergreen|ель|tree pine
🌳 tree|дерево|tree
🌴 palm_tree|пальма|palm beach
🌱 seedling|росток|plant sprout grow
🌿 herb|трава|herb leaf
🍀 four_leaf_clover|клевер|luck clover удача
🍁 maple_leaf|кленовый лист|autumn leaf осень
🍂 fallen_leaf|опавшие листья|autumn fall осень
🍄 mushroom|гриб|mushroom
🌷 tulip|тюльпан|flower tulip цветок
🌹 rose|роза|flower rose
🌻 sunflower|подсолнух|flower sun
🌸 cherry_blossom|сакура|flower spring весна
💐 bouquet|букет|flowers bouquet цветы
`;

const food = `
🍏 green_apple|зелёное яблоко|apple fruit фрукт
🍎 apple|яблоко|apple fruit
🍐 pear|груша|pear fruit
🍊 tangerine|мандарин|orange fruit апельсин
🍋 lemon|лимон|lemon sour
🍌 banana|банан|banana
🍉 watermelon|арбуз|watermelon summer
🍇 grapes|виноград|grapes
🍓 strawberry|клубника|strawberry berry
🫐 blueberries|черника|blueberry berry
🍒 cherries|вишня|cherry
🍑 peach|персик|peach
🥭 mango|манго|mango
🍍 pineapple|ананас|pineapple
🥥 coconut|кокос|coconut
🥝 kiwi|киви|kiwi
🍅 tomato|помидор|tomato
🥑 avocado|авокадо|avocado
🥦 broccoli|брокколи|broccoli vegetable
🥕 carrot|морковь|carrot
🌽 corn|кукуруза|corn
🌶️ hot_pepper|перец|pepper spicy острое
🥔 potato|картошка|potato
🧄 garlic|чеснок|garlic
🧅 onion|лук|onion
🍞 bread|хлеб|bread
🥐 croissant|круассан|croissant
🥖 baguette|багет|baguette bread
🥨 pretzel|крендель|pretzel
🧀 cheese|сыр|cheese
🥚 egg|яйцо|egg
🍳 cooking|яичница|egg breakfast завтрак
🥞 pancakes|блины|pancakes блинчики
🥓 bacon|бекон|bacon
🍗 poultry_leg|ножка|chicken meat курица
🥩 steak|стейк|meat steak мясо
🌭 hotdog|хот-дог|hotdog
🍔 hamburger|бургер|burger hamburger
🍟 fries|картошка фри|fries
🍕 pizza|пицца|pizza
🥪 sandwich|сэндвич|sandwich бутерброд
🌮 taco|тако|taco
🌯 burrito|буррито|burrito шаурма
🥗 salad|салат|salad
🍝 spaghetti|спагетти|pasta spaghetti паста
🍜 ramen|рамен|ramen noodles лапша
🍲 stew|рагу|stew soup суп
🍛 curry|карри|curry rice
🍣 sushi|суши|sushi
🍱 bento|бенто|bento
🥟 dumpling|пельмени|dumpling пельмень
🍤 shrimp|креветка|shrimp
🍚 rice|рис|rice
🍦 ice_cream|мороженое|ice cream
🍩 doughnut|пончик|donut doughnut
🍪 cookie|печенье|cookie
🎂 birthday_cake|торт|cake birthday день рождения
🍰 cake|пирожное|cake
🧁 cupcake|капкейк|cupcake
🍫 chocolate|шоколад|chocolate
🍬 candy|конфета|candy sweet
🍭 lollipop|леденец|lollipop
🍿 popcorn|попкорн|popcorn movie кино
🧂 salt|соль|salt
☕ coffee|кофе|coffee cafe
🍵 tea|чай|tea green
🧋 bubble_tea|бабл-ти|boba bubble tea
🥤 cup_straw|напиток|soda drink
🧃 juice|сок|juice
🍺 beer|пиво|beer
🍻 beers|пиво за встречу|cheers beer
🥂 champagne_glasses|бокалы|cheers celebrate тост
🍷 wine|вино|wine
🥃 tumbler|виски|whiskey drink
🍸 cocktail|коктейль|cocktail drink
🍾 champagne|шампанское|champagne celebrate
🧊 ice|лёд|ice cube
🍴 fork_knife|столовые приборы|food eat еда
🥢 chopsticks|палочки|chopsticks
`;

const activities = `
⚽ soccer|футбол|football soccer мяч
🏀 basketball|баскетбол|basketball ball
🏈 football|американский футбол|football
⚾ baseball|бейсбол|baseball
🎾 tennis|теннис|tennis
🏐 volleyball|волейбол|volleyball
🏓 ping_pong|пинг-понг|ping pong table tennis
🏸 badminton|бадминтон|badminton
🥊 boxing|бокс|boxing glove
🥋 martial_arts|кимоно|karate judo
⛳ golf|гольф|golf
⛸️ ice_skate|коньки|skate ice
🎿 ski|лыжи|ski
🏂 snowboarder|сноуборд|snowboard
🏋️ weight_lifter|штанга|gym lift спорт
🚴 biker|велосипедист|bike cycling велик
🏊 swimmer|пловец|swim
🧗 climber|скалолаз|climb
🏆 trophy|кубок|trophy win победа
🥇 first_place|золото|gold first первое место
🥈 second_place|серебро|silver second
🥉 third_place|бронза|bronze third
🏅 medal|медаль|medal
🎖️ military_medal|орден|medal
🎗️ reminder_ribbon|лента|ribbon
🎫 ticket|билет|ticket
🎪 circus|цирк|circus
🎭 theater|театр|theater drama
🎨 art|палитра|art paint design рисую
🎬 clapper|кино|movie film кинохлопушка
🎤 microphone|микрофон|mic sing караоке
🎧 headphones|наушники|headphones music музыка
🎼 score|ноты|music score
🎹 piano|пианино|piano keyboard
🥁 drum|барабан|drum
🎷 saxophone|саксофон|sax jazz
🎺 trumpet|труба|trumpet
🎸 guitar|гитара|guitar rock
🎻 violin|скрипка|violin
🎲 game_die|кубик|dice game random
♟️ chess_pawn|шахматы|chess pawn
🎯 dart|в яблочко|target bullseye цель
🎳 bowling|боулинг|bowling
🎮 video_game|геймпад|game controller игра
🕹️ joystick|джойстик|joystick arcade
🧩 puzzle|пазл|puzzle piece
🎰 slot_machine|автомат|slot casino
🎉 tada|хлопушка|party celebrate ура праздник
🎊 confetti_ball|конфетти|confetti party
🎈 balloon|шарик|balloon party
🎁 gift|подарок|present gift
🎃 jack_o_lantern|тыква|halloween pumpkin хэллоуин
🎆 fireworks|фейерверк|fireworks celebrate салют
✨ sparkles|блёстки|sparkles magic new новое
`;

const travel = `
🚗 car|машина|car auto автомобиль
🚕 taxi|такси|taxi cab
🚌 bus|автобус|bus
🚎 trolleybus|троллейбус|trolley
🏎️ racing_car|гоночная машина|race fast быстро
🚓 police_car|полиция|police
🚑 ambulance|скорая|ambulance
🚒 fire_engine|пожарная|fire truck
🚚 truck|грузовик|truck delivery доставка
🚜 tractor|трактор|tractor
🛴 scooter|самокат|scooter kick
🚲 bike|велосипед|bicycle bike велик
🛵 motor_scooter|мопед|scooter moped
🏍️ motorcycle|мотоцикл|motorcycle
🚨 rotating_light|мигалка|alert siren тревога
🚥 traffic_light|светофор|traffic light
🚧 construction|ремонт|construction wip в работе
⛽ fuelpump|заправка|gas fuel бензин
🚂 locomotive|паровоз|train steam
🚆 train|поезд|train
🚇 metro|метро|subway metro
🚊 tram|трамвай|tram
✈️ airplane|самолёт|plane flight полёт
🛫 departure|вылет|takeoff departure
🛬 arrival|посадка|landing arrival
🚁 helicopter|вертолёт|helicopter
🚀 rocket|ракета|rocket launch ship деплой запуск
🛸 ufo|НЛО|ufo alien
🛰️ satellite|спутник|satellite space
⛵ sailboat|парусник|boat sail
🚤 speedboat|катер|boat
🚢 ship|корабль|ship
⚓ anchor|якорь|anchor
🗺️ world_map|карта|map world
🧭 compass|компас|compass navigation
🏔️ mountain_snow|гора|mountain snow
🌋 volcano|вулкан|volcano
🏕️ camping|кемпинг|camping tent поход
🏖️ beach|пляж|beach umbrella отпуск
🏝️ island|остров|island vacation
🏠 house|дом|home house
🏡 house_garden|дом с садом|home garden
🏢 office|офис|office building работа
🏥 hospital|больница|hospital
🏦 bank|банк|bank
🏫 school|школа|school
🏰 castle|замок|castle
🗼 tokyo_tower|башня|tower
🗽 statue_liberty|статуя свободы|liberty new york
⛪ church|церковь|church
🌆 city_dusk|город вечером|city dusk
🌃 night_stars|ночной город|night city
🌉 bridge_night|мост ночью|bridge
🎢 roller_coaster|американские горки|roller coaster
🎡 ferris_wheel|колесо обозрения|ferris wheel
🌍 earth_africa|земля|earth globe world мир
🌎 earth_americas|земля|earth globe world
🌏 earth_asia|земля|earth globe world
🌙 crescent_moon|луна|moon night ночь
🌞 sun_face|солнце|sun sunny
⭐ star|звезда|star favorite избранное
🌟 star2|сияющая звезда|star glow
☀️ sunny|солнечно|sun weather погода
⛅ partly_sunny|облачно|cloud sun weather
☁️ cloud|облако|cloud weather
🌧️ rain|дождь|rain weather
⛈️ thunderstorm|гроза|storm thunder
❄️ snowflake|снежинка|snow cold winter зима
☃️ snowman|снеговик|snowman winter
🌈 rainbow|радуга|rainbow pride
🔥 fire|огонь|fire hot lit огонь жара
💧 droplet|капля|water drop вода
🌊 ocean|волна|wave ocean sea море
⚡ zap|молния|lightning fast electric быстро
🌪️ tornado|торнадо|tornado
`;

const objects = `
⌚ watch|часы|watch time время
📱 iphone|телефон|phone mobile смартфон
💻 computer|ноутбук|laptop computer компьютер
⌨️ keyboard|клавиатура|keyboard type
🖥️ desktop|монитор|desktop computer monitor
🖱️ mouse_computer|мышка|mouse click
💾 floppy_disk|дискета|save floppy сохранить
💿 cd|диск|cd disc
📷 camera|фотоаппарат|camera photo фото
📹 video_camera|видеокамера|video camera
🎥 movie_camera|кинокамера|movie camera
📞 telephone_receiver|трубка|phone call звонок
📺 tv|телевизор|tv television
📻 radio|радио|radio
🎙️ studio_microphone|студийный микрофон|mic podcast подкаст
⏰ alarm_clock|будильник|alarm clock
⏳ hourglass|песочные часы|hourglass wait ждать
🔋 battery|батарея|battery charge заряд
🔌 plug|вилка|plug electric
💡 bulb|лампочка|idea light идея
🔦 flashlight|фонарик|flashlight torch
🕯️ candle|свеча|candle
🧯 extinguisher|огнетушитель|fire extinguisher
💸 money_wings|деньги улетают|money spend трата
💵 dollar|доллары|money dollar деньги
💰 moneybag|мешок денег|money rich
💳 credit_card|карта|card payment оплата
💎 gem|алмаз|diamond gem
⚖️ scales|весы|balance justice law закон
🧰 toolbox|инструменты|tools toolbox
🔧 wrench|гаечный ключ|wrench fix tool settings
🔨 hammer|молоток|hammer build
⚒️ hammer_pick|молот и кирка|tools
🛠️ tools|инструменты|tools build fix
⛏️ pick|кирка|pick mine
🔩 nut_bolt|гайка|bolt
⚙️ gear|шестерёнка|settings gear config настройки
🧲 magnet|магнит|magnet
🔫 water_gun|водяной пистолет|gun water
💣 bomb|бомба|bomb boom
🔪 knife|нож|knife
🛡️ shield|щит|shield security защита
🔮 crystal_ball|хрустальный шар|magic fortune
🧿 nazar|оберег|amulet evil eye
💊 pill|таблетка|pill medicine лекарство
💉 syringe|шприц|vaccine syringe
🧬 dna|ДНК|dna genetics
🔬 microscope|микроскоп|science lab
🔭 telescope|телескоп|telescope space
🧪 test_tube|пробирка|test lab experiment тест
🧹 broom|метла|broom clean уборка
🧻 roll_of_paper|бумага|toilet paper
🛒 shopping_cart|корзина|cart shopping покупки
🔑 key|ключ|key password пароль
🗝️ old_key|старый ключ|key
🚪 door|дверь|door exit выход
🪑 chair|стул|chair
🛋️ couch|диван|couch sofa
🛏️ bed|кровать|bed
🧸 teddy_bear|мишка|teddy toy
📦 package|коробка|package box посылка
✉️ envelope|конверт|mail email письмо
📧 email|почта|email mail
📨 incoming_envelope|входящее|mail inbox
📮 postbox|почтовый ящик|mailbox
📝 memo|заметка|note memo write записка
📄 page|документ|page document doc
📊 bar_chart|диаграмма|chart stats статистика
📈 chart_up|рост|chart growth up график
📉 chart_down|падение|chart down
📋 clipboard|планшет|clipboard list
📌 pushpin|кнопка|pin pinned закрепить
📎 paperclip|скрепка|attach clip вложение
✂️ scissors|ножницы|cut scissors
🗂️ dividers|разделители|folders index
📁 folder|папка|folder directory
📅 calendar|календарь|calendar date дата
🗓️ spiral_calendar|настольный календарь|calendar schedule
🔒 lock|замок|lock secure закрыто
🔓 unlock|открыто|unlock open
🔔 bell|колокольчик|notification bell уведомление
🔕 no_bell|без звука|mute silent тихо
📢 loudspeaker|громкоговоритель|announce speaker объявление
📣 mega|мегафон|megaphone announce
🔍 mag|лупа|search find поиск
🔗 link|ссылка|link url chain
📚 books|книги|books library учёба
📖 book|книга|book read читать
✏️ pencil|карандаш|pencil edit править
🖊️ pen|ручка|pen write
🖌️ paintbrush|кисть|brush paint
🏷️ label|ярлык|tag label метка
`;

const symbols = `
❤️ heart|сердце|love like любовь
🧡 orange_heart|оранжевое сердце|love heart
💛 yellow_heart|жёлтое сердце|love heart
💚 green_heart|зелёное сердце|love heart
💙 blue_heart|синее сердце|love heart
💜 purple_heart|фиолетовое сердце|love heart
🖤 black_heart|чёрное сердце|heart dark
🤍 white_heart|белое сердце|heart
🤎 brown_heart|коричневое сердце|heart
💔 broken_heart|разбитое сердце|sad heartbreak
❤️‍🔥 heart_on_fire|горящее сердце|love passion
💕 two_hearts|два сердца|love hearts
💖 sparkling_heart|сияющее сердце|love heart
💗 heartpulse|растущее сердце|love heart
💘 cupid|сердце со стрелой|love cupid
💯 100|сто|100 perfect hundred идеально
💢 anger|злость|angry
💥 boom|бум|boom explosion взрыв
💫 dizzy|головокружение|dizzy star
💦 sweat_drops|капли|sweat water
💨 dash|убегаю|dash fast wind
💬 speech_balloon|сообщение|chat message comment чат
💭 thought_balloon|мысль|thought think
🗯️ anger_bubble|гневная реплика|angry speech
💤 zzz|сон|sleep zzz
✅ white_check_mark|готово|done check yes ok галочка
☑️ ballot_box_check|отмечено|check done
✔️ heavy_check_mark|галочка|check done
❌ x|крестик|no wrong cancel нет ошибка
❎ negative_squared_cross|отмена|cancel no
➕ plus|плюс|plus add добавить
➖ minus|минус|minus remove
➗ divide|деление|divide
✖️ multiply|умножение|multiply
❓ question|вопрос|question what
❗ exclamation|восклицание|exclamation important важно
‼️ bangbang|двойное восклицание|exclamation
⁉️ interrobang|вопрос и восклицание|what
⚠️ warning|внимание|warning caution осторожно
🚫 no_entry_sign|запрещено|forbidden no
⛔ no_entry|вход запрещён|stop no entry
🔞 underage|18+|nsfw adult
♻️ recycle|переработка|recycle
🔄 arrows_counterclockwise|обновить|refresh reload sync
🔁 repeat|повтор|repeat loop
➡️ arrow_right|вправо|right arrow next
⬅️ arrow_left|влево|left arrow back
⬆️ arrow_up|вверх|up arrow
⬇️ arrow_down|вниз|down arrow
↩️ leftwards_arrow_hook|ответ|reply back
🆕 new|новое|new
🆗 ok|ок|ok
🆒 cool|круто|cool
🆓 free|бесплатно|free
🆘 sos|SOS|help sos помогите
ℹ️ information|информация|info
🔴 red_circle|красный круг|red dot busy
🟠 orange_circle|оранжевый круг|orange dot
🟡 yellow_circle|жёлтый круг|yellow dot away
🟢 green_circle|зелёный круг|green dot online
🔵 blue_circle|синий круг|blue dot
🟣 purple_circle|фиолетовый круг|purple dot
⚫ black_circle|чёрный круг|black dot
⚪ white_circle|белый круг|white dot
🟥 red_square|красный квадрат|red square
🟩 green_square|зелёный квадрат|green square
🟦 blue_square|синий квадрат|blue square
🔺 red_triangle_up|треугольник вверх|up triangle
🔻 red_triangle_down|треугольник вниз|down triangle
🔸 small_orange_diamond|ромбик|diamond
🎵 musical_note|нота|music note
🎶 notes|ноты|music notes
♾️ infinity|бесконечность|infinity forever
💲 heavy_dollar_sign|доллар|dollar money
©️ copyright|копирайт|copyright
®️ registered|зарегистрировано|registered
™️ tm|торговая марка|trademark
#️⃣ hash|решётка|hash number
*️⃣ asterisk|звёздочка|asterisk
0️⃣ zero|ноль|zero number
1️⃣ one|один|one number
2️⃣ two|два|two number
3️⃣ three|три|three number
🔟 keycap_ten|десять|ten number
☮️ peace|мир|peace
☯️ yin_yang|инь-ян|balance yin yang
♈ aries|овен|zodiac
♌ leo|лев|zodiac
`;

const flags = `
🏁 checkered_flag|клетчатый флаг|finish race финиш
🚩 triangular_flag|флажок|flag red
🏳️ white_flag|белый флаг|surrender
🏴 black_flag|чёрный флаг|flag
🏳️‍🌈 rainbow_flag|радужный флаг|pride lgbt
🏴‍☠️ pirate_flag|пиратский флаг|pirate jolly roger
🇷🇺 ru|Россия|russia flag
🇺🇦 ua|Украина|ukraine flag
🇧🇾 by|Беларусь|belarus flag
🇰🇿 kz|Казахстан|kazakhstan flag
🇺🇸 us|США|usa america flag
🇬🇧 gb|Великобритания|uk britain flag
🇩🇪 de|Германия|germany flag
🇫🇷 fr|Франция|france flag
🇯🇵 jp|Япония|japan flag
🇨🇳 cn|Китай|china flag
🇪🇺 eu|Евросоюз|europe eu flag
`;

const sources: Array<[EmojiCategoryId, string, string]> = [
  ['smileys', 'Смайлы', smileys],
  ['people', 'Люди и жесты', people],
  ['nature', 'Животные и природа', animals],
  ['food', 'Еда и напитки', food],
  ['activities', 'Занятия', activities],
  ['travel', 'Путешествия и погода', travel],
  ['objects', 'Предметы', objects],
  ['symbols', 'Символы', symbols],
  ['flags', 'Флаги', flags],
];

function parse(id: EmojiCategoryId, label: string, source: string): EmojiCategory {
  const emojis = source
    .trim()
    .split('\n')
    .map((line) => {
      const space = line.indexOf(' ');
      const [shortcode = '', name = '', keywords = ''] = line.slice(space + 1).split('|');

      return {
        char: line.slice(0, space),
        shortcode,
        name,
        keywords: keywords.split(' ').filter(Boolean),
      };
    });

  return { id, label, emojis };
}

export const emojiCategories: EmojiCategory[] = sources.map(([id, label, source]) =>
  parse(id, label, source),
);
