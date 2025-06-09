// Solitaire (Klondike) core logic and UI

// Card suits and values
const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = [
    "A", "2", "3", "4", "5", "6", "7",
    "8", "9", "10", "J", "Q", "K"
];
function cardColor(suit) {
    return (suit === "♥" || suit === "♦") ? "red" : "black";
}

// Game state
let stock = [];
let waste = [];
let foundations = [[], [], [], []]; // 4 foundations
let tableau = [[], [], [], [], [], [], []]; // 7 tableau piles

// Drag state
let dragData = null; // {cards, from, fromIndex, pileType}

// ----------- Game Setup -----------
function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function makeDeck() {
    let deck = [];
    for (let s = 0; s < 4; s++)
        for (let v = 0; v < 13; v++)
            deck.push({ suit: SUITS[s], value: VALUES[v], valueNum: v + 1, faceUp: false });
    return deck;
}

function deal() {
    stock = [];
    waste = [];
    foundations = [[], [], [], []];
    tableau = [[], [], [], [], [], [], []];
    let deck = makeDeck();
    shuffle(deck);
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j <= i; j++) {
            let card = deck.pop();
            card.faceUp = (j === i);
            tableau[i].push(card);
        }
    }
    while (deck.length) stock.push(deck.pop());
    render();
}

// ----------- Rendering -----------
function render() {
    // Stock
    let stockDiv = document.getElementById("stock");
    stockDiv.innerHTML = "";
    let stockCard = document.createElement("div");
    stockCard.className = "card face-down";
    stockCard.style.position = "absolute";
    if (stock.length > 0) {
        stockCard.addEventListener("click", drawFromStock);
        stockDiv.appendChild(stockCard);
    }

    // Waste
    let wasteDiv = document.getElementById("waste");
    wasteDiv.innerHTML = "";
    if (waste.length > 0) {
        let card = waste[waste.length - 1];
        let cardDiv = makeCardDiv(card);
        cardDiv.style.position = "absolute";
        cardDiv.style.left = "0";
        cardDiv.draggable = true;
        cardDiv.addEventListener("dragstart", e => handleDragStart(e, [card], "waste", waste.length-1));
        wasteDiv.appendChild(cardDiv);
    }

    // Foundations
    for (let i = 0; i < 4; i++) {
        let fDiv = document.getElementById(`foundation-${i}`);
        fDiv.innerHTML = "";
        if (foundations[i].length > 0) {
            let card = foundations[i][foundations[i].length - 1];
            let cardDiv = makeCardDiv(card);
            cardDiv.style.position = "absolute";
            cardDiv.style.left = "0";
            fDiv.appendChild(cardDiv);
        }
        fDiv.ondragover = e => e.preventDefault();
        fDiv.ondrop = e => handleDrop(e, "foundation", i);
    }

    // Tableau
    for (let i = 0; i < 7; i++) {
        let tDiv = document.getElementById(`tableau-${i}`);
        tDiv.innerHTML = "";
        let pile = tableau[i];
        let y = 0;
        for (let j = 0; j < pile.length; j++) {
            let card = pile[j];
            let cardDiv = makeCardDiv(card);
            cardDiv.style.top = y + "px";
            cardDiv.style.zIndex = j;
            if (card.faceUp) {
                cardDiv.draggable = true;
                cardDiv.addEventListener("dragstart", e =>
                    handleDragStart(e, pile.slice(j), "tableau", i, j)
                );
            }
            if (!card.faceUp && j === pile.length - 1) {
                cardDiv.addEventListener("click", () => {
                    card.faceUp = true;
                    render();
                });
            }
            tDiv.appendChild(cardDiv);
            y += card.faceUp ? 28 : 8;
        }
        tDiv.ondragover = e => e.preventDefault();
        tDiv.ondrop = e => handleDrop(e, "tableau", i);
    }
}

function makeCardDiv(card) {
    let div = document.createElement("div");
    div.className = "card" + (card.faceUp ? "" : " face-down") + (cardColor(card.suit) === "red" ? " red" : "");
    div.textContent = card.faceUp ? (card.value + card.suit) : "";
    return div;
}

// ----------- Game Logic -----------
function drawFromStock() {
    if (stock.length === 0) {
        // Reset stock from waste
        while (waste.length) {
            let c = waste.pop();
            c.faceUp = false;
            stock.push(c);
        }
    } else {
        let c = stock.pop();
        c.faceUp = true;
        waste.push(c);
    }
    render();
}

function handleDragStart(e, cards, pileType, pileIndex, cardIndex) {
    dragData = { cards, pileType, pileIndex, cardIndex };
    e.dataTransfer.setData("text/plain", "");
}

function handleDrop(e, targetType, targetIndex) {
    e.preventDefault();
    if (!dragData) return;
    let { cards, pileType, pileIndex, cardIndex } = dragData;
    let card = cards[0];

    if (targetType === "foundation") {
        let foundation = foundations[targetIndex];
        if (canMoveToFoundation(card, foundation)) {
            removeFromSource(cards, pileType, pileIndex, cardIndex);
            foundation.push(card);
            render();
        }
    }
    else if (targetType === "tableau") {
        let dest = tableau[targetIndex];
        if (canMoveToTableau(cards, dest)) {
            removeFromSource(cards, pileType, pileIndex, cardIndex);
            dest.push(...cards);
            render();
        }
    }
    dragData = null;
}

function removeFromSource(cards, pileType, pileIndex, cardIndex) {
    if (pileType === "waste") {
        waste.pop();
    } else if (pileType === "foundation") {
        foundations[pileIndex].pop();
    } else if (pileType === "tableau") {
        tableau[pileIndex].splice(cardIndex, cards.length);
        // Flip next card if needed
        let pile = tableau[pileIndex];
        if (pile.length && !pile[pile.length - 1].faceUp) {
            pile[pile.length - 1].faceUp = true;
        }
    }
}

// Rules
function canMoveToFoundation(card, pile) {
    if (pile.length === 0) return card.valueNum === 1;
    let top = pile[pile.length - 1];
    return top.suit === card.suit && card.valueNum === top.valueNum + 1;
}
function canMoveToTableau(cards, dest) {
    let card = cards[0];
    if (dest.length === 0) return card.valueNum === 13;
    let top = dest[dest.length - 1];
    return top.faceUp && cardColor(card.suit) !== cardColor(top.suit) && card.valueNum === top.valueNum - 1;
}

// ----------- Controls -----------
document.getElementById("restart-btn").onclick = deal;

// Initial game
deal();
