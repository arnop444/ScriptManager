function showMessage(txt) {
    const box = document.getElementById("rec_message");
    box.textContent = txt;
    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
    }, 1500);
}

function lectureJson (menu) {
// lecture du fichier json procuré par le serveur, pour les bouton menus
    fetch("http://localhost:8765/menu_script.json")
        .then(r => r.json())
        .then(scriptList => {
            const select = document.getElementById(menu);
                        // Ajoute une "entête" désactivée
            const headerOpt = document.createElement("option");
            headerOpt.textContent = "📂 Scripts dispo";
            headerOpt.disabled = true;
            headerOpt.selected = true;  // affiché par défaut
            headerOpt.style.fontWeight = "bold"; // mise en gras
            select.appendChild(headerOpt);
            scriptList
            .sort ((a,b)=> a.name.localeCompare(b.name))    
            .forEach(s => {
                //console.log(s);
                const opt = document.createElement("option");
                opt.value = s.name;
                opt.textContent = s.name;
                if (s.comment) opt.title = s.comment;  // 👈 Tooltip au survol
                select.appendChild(opt);
            });
        });                
    }
async function chargementFichier (fic) {
    // chargement du fichier
    const url="http://localhost:8765/ScriptExecutor/" + fic;
    //console.log ("✅  fichier à charger : ", url);
    return fetch(url)
        .then(r =>  {
            if (!r.ok) throw new Error ("HTTP erreur :" + r.status);
            return r.text(); 
        })
    }

function lectureFichier(btn) {
    const fic = document.getElementById(btn).value;
    console.log("✅ champ script : ", fic, " Bouton : ",btn );
    chargementFichier(fic)
        .then (content => {
            content = content.replace(
                /MOV\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)/g,
                (m, x, y) => `MOV ${Math.round(parseFloat(x))} ${Math.round(parseFloat(y))}`
                );
            if (btn == "btn_rec_load") {
                document.getElementById('script_editor').value = content;
            } else if 
                (btn == "btn_rec_other") { 
                    document.getElementById('script_modele').value = content;
                } else {
                        document.getElementById('script_modele').value = "Id du bouton non trouvé : " + btn ;
                }
            })
        .catch (err => {
            console.error ("erreur lecture fichier : ", err )
            document.getElementById('script_editor').value = "Erreur chargement fichier " + fic;
        })
} 
async function sauvegardeFichier () {
    const filename = document.getElementById("btn_rec_load").value;
    const content  = document.getElementById("script_editor").value;

    fetch("http://localhost:8765/save_script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content })
    })
    .then(r => r.text())
    .then(msg => {
        console.log("Sauvegarde OK :", msg)
        showMessage("💾 Script sauvegardé !");
    })
    .catch(err => console.error("Erreur sauvegarde :", err));
}

function capturerPositionSouris() {
    // Appelle du script Python position.py pour récupérer la position
    // et affiche le résultat dans le champ dédié.
    fetch('http://localhost:8765/capturer_position')
        .then(response => response.json())
        .then(data => {
            const posix = data.x + "/" + data.y;
            document.getElementById('rec_pos').value = posix;
        });
}

function AppliquerTempo () {
    let tempo = document.getElementById("rec_wait_champ").value.trim();
    tempo = tempo.replace(',', '.');
    let content = document.getElementById("script_editor").value;
    if (!tempo || isNaN(tempo)) {
        showMessage("⛔ Tempo invalide !");
        return;
    }
    // Remplace toutes les lignes WAIT XXX par WAIT tempo
    const newContent = content.replace(/WAIT\s+\d+(?:[.,]\d+)?/g, "WAIT " + tempo);

    document.getElementById("script_editor").value = newContent;

    showMessage("⏱️ Temporisation appliquée !");
}

function insererCode (code) {
// insertion des lignes MOV CLIC WAIT en utilisant les données des champs
    let textarea = document.getElementById("script_editor");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0,start);
    const after = textarea.value.substring(end);
    textarea.value = before + code + after;
    // Replace le curseur après insertion
    const newPos = before.length + code.length;
    textarea.selectionStart = textarea.selectionEnd = newPos;
    textarea.focus();
    showMessage("📌 Code inséré !");
}

function sequenceCode () {
    const [x, y] = document.getElementById("rec_pos").value.split("/");
    let tempo= document.getElementById("rec_wait_champ").value.trim();
    isNaN(tempo) ? 0.5 : tempo;
    tempo = tempo.replace(",", ".");
    const code = "MOV " + x + " " + y + "\n" + "CLIC\n" + "WAIT " + tempo + "\n"
    insererCode(code);
}

function instructionMOV () {
    const [x, y] = document.getElementById("rec_pos").value.split("/");
    const code = "MOV " + x + " " + y + "\n"
    insererCode(code);
}
function getCurrentLine(textarea) {
    // récupération de ligne courante dans textarea
    const pos = textarea.selectionStart;
    const text = textarea.value;

    let start = text.lastIndexOf("\n", pos - 1);
    if (start === -1) start = 0;
    else start += 1;

    let end = text.indexOf("\n", pos);
    if (end === -1) end = text.length;

    return text.substring(start, end).trim();
}
 function getPosition() {
    const line = getCurrentLine(document.getElementById("script_editor"));
    //const m = line.match(/^MOV\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/i);
    const m = line.match(/^\s*MOV\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)/i)

    if (!m) 
        {   showMessage("⛔ Ligne MOV non valide !");
            return ;
        }
    return { x: m[1], y: m[2] };
 }

function deplacementVers() {
    // Appelle du script Python position.py pour déplacer la souris vers la position
    // et affiche la position dans le champ dédié.
    
    //const posix = document.getElementById("rec_pos").value.trim();
    const posix = getPosition();
    if (!posix) return;
    // Normalisation des coordonnées avant passage dans l'enfer du serveur
    let x = posix.x.normalize("NFKC").trim();
    let y = posix.y.normalize("NFKC").trim();

    // Remplace les tirets longs, demi-tirets, etc.
    x = x.replace(/–|—|−/g, "-");
    y = y.replace(/–|—|−/g, "-");

    // Sécurité : retire tout autre caractère
    x = x.replace(/[^0-9\-]/g, "");
    y = y.replace(/[^0-9\-]/g, "");

    console.log("➡️ Coord normalisées :", x, y);
    const debug = false;
    fetch(`http://localhost:8765/deplacer_position?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}&debug=${encodeURIComponent(debug)}`)
        .then(r => r.json())
        .then(resultat => {
            console.log("➡️ Déplacement demandé :", resultat);
            showMessage("🖱️ Déplacement exécuté !");
            const posix = resultat.x + "/" + resultat.y;
            document.getElementById('rec_pos').value = posix;
        })
        .catch(err => {
            console.error("❌ Erreur déplacement :", err);
            showMessage("⛔ Erreur déplacement !");
        });
}

lectureJson("btn_rec_load");
lectureJson("btn_rec_other");

document.getElementById('btn_rec_load').addEventListener("change", () => {
        lectureFichier("btn_rec_load");
});
document.getElementById('btn_rec_other').addEventListener("change", () => {
        lectureFichier("btn_rec_other");
});

document.getElementById('btn_rec_backup').addEventListener("click", () => {
        sauvegardeFichier();
})
document.getElementById('rec_getpos').addEventListener("click", (ev) => {
        instructionMOV();
})

document.getElementById('rec_appliquer').addEventListener("click", () => {
        AppliquerTempo();
})
document.getElementById('rec_inserer').addEventListener("click", () => {
        sequenceCode();
})

document.addEventListener("keydown", ev => {
    // appel de la position de la souris via F8
    if (ev.key === "F8") {
        ev.preventDefault();
        capturerPositionSouris();
    }
});
document.getElementById('rec_deplacement').addEventListener("click", () => {
        deplacementVers();
})
