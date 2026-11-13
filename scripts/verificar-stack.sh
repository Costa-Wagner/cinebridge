#!/usr/bin/env bash
# Verificacao ponta a ponta da CineBridge em execucao (docker compose up -d --build).
# Cria um projeto, pede a recomendacao, aceita a equipe e confere o que cada servico registrou.
# Uso: bash scripts/verificar-stack.sh      (sai com codigo 1 se algum item falhar)
set -u

API=${API:-http://localhost:3000}
PROFISSIONAIS=${PROFISSIONAIS:-http://localhost:3001}
PROJETOS=${PROJETOS:-http://localhost:3002}
NOTIFICACOES=${NOTIFICACOES:-http://localhost:3003}
RABBITMQ=${RABBITMQ:-http://localhost:15672}
MQ_USER=${MQ_USER:-guest}
MQ_PASSWORD=${MQ_PASSWORD:-guest}
FALHAS=0

ok() { echo "  [OK] $1"; }
falha() { echo "  [FALHA] $1"; FALHAS=$((FALHAS + 1)); }
confere() { if [ "$1" = "1" ]; then ok "$2"; else falha "$2"; fi; }
# json '<expressao sobre d>' le o JSON da entrada padrao
json() { node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{try{const d=JSON.parse(s);console.log($1)}catch(e){console.log('')}})"; }
# espera ate o comando (string) dar certo, por ate N segundos
espera() { local limite=$1; shift; local i=0; while [ $i -lt "$limite" ]; do if eval "$*" >/dev/null 2>&1; then return 0; fi; sleep 1; i=$((i + 1)); done; return 1; }
post() { curl -s -X POST "$1" -H "Content-Type: application/json" -d "$2"; }

echo "1) Saude dos servicos"
for par in "api|$API" "profissionais|$PROFISSIONAIS" "projetos|$PROJETOS" "notificacoes|$NOTIFICACOES"; do
  nome=${par%%|*}; url=${par#*|}
  if espera 60 "curl -sf $url/health"; then ok "cinebridge-$nome responde em $url/health"; else falha "cinebridge-$nome nao respondeu em $url/health"; fi
done

echo "2) Criar projeto (api)"
CORPO='{"tipoCaptacao":"DOCUMENTARIO","duracaoEstimadaMinutos":60,"orcamentoTotal":20000,"dataEntrega":"2026-12-01","localizacaoFilmagem":"Rio","tema":"Rios","entrevistados":["Ana"],"papeisObrigatorios":[{"papel":"DIRETOR","peso":10},{"papel":"EDITOR","peso":8}]}'
ID=$(post "$API/projetos" "$CORPO" | json 'd.id')
confere "$([ -n "$ID" ] && echo 1 || echo 0)" "projeto criado (id: ${ID:-nenhum})"
[ -z "$ID" ] && { echo "Sem projeto, nao ha o que verificar."; exit 1; }

echo "3) Recomendacao (a api consulta cinebridge-profissionais pela fila)"
EQUIPE=$(post "$API/projetos/$ID/recomendar" '{}')
QTD=$(echo "$EQUIPE" | json 'd.membros.length')
confere "$([ "$QTD" = "2" ] && echo 1 || echo 0)" "equipe recomendada com 2 papeis (DIRETOR e EDITOR)"

echo "4) Aceite da equipe (convites)"
FORMADA=""
for PAPEL in DIRETOR EDITOR; do
  PROF=$(echo "$EQUIPE" | json "d.membros.find(m=>m.papel==='$PAPEL').profissional.id")
  CONVITE=$(post "$API/projetos/$ID/equipe/aceitar" "{\"papel\":\"$PAPEL\",\"profissionalId\":\"$PROF\"}" | json 'd.conviteId')
  FORMADA=$(post "$API/convites/$CONVITE/responder" '{"aceito":true}' | json 'd.equipeFormada')
done
confere "$([ "$FORMADA" = "true" ] && echo 1 || echo 0)" "equipe formada apos o ultimo aceite"

echo "5) cinebridge-projetos registrou o ciclo de vida (via fila)"
espera 15 "curl -s $PROJETOS/projetos/$ID | grep -q FINALIZADO"
STATUS=$(curl -s "$PROJETOS/projetos/$ID" | json 'd.status')
confere "$([ "$STATUS" = "FINALIZADO" ] && echo 1 || echo 0)" "status do projeto no servico de projetos: ${STATUS:-?}"
MEMBROS=$(curl -s "$PROJETOS/projetos/$ID" | json 'd.equipe.length')
confere "$([ "$MEMBROS" = "2" ] && echo 1 || echo 0)" "equipe registrada com 2 membros"

echo "6) cinebridge-notificacoes registrou e enviou as notificacoes"
ESPERADAS="projetos:PROJETO_CRIADO api:RECOMENDACAO_GERADA api:CONVITE_ENVIADO api:CONVITE_ACEITO api:EQUIPE_FORMADA projetos:PROJETO_FINALIZADO"
espera 20 "curl -s '$NOTIFICACOES/notificacoes?projetoId=$ID' | grep -q PROJETO_FINALIZADO"
LISTA=$(curl -s "$NOTIFICACOES/notificacoes?projetoId=$ID")
for esperado in $ESPERADAS; do
  presente=$(echo "$LISTA" | json "d.some(n=>n.origem+':'+n.tipoEvento==='$esperado')")
  confere "$([ "$presente" = "true" ] && echo 1 || echo 0)" "notificacao $esperado"
done
TODAS=$(echo "$LISTA" | json 'd.length>0 && d.every(n=>n.status==="ENVIADA")')
confere "$([ "$TODAS" = "true" ] && echo 1 || echo 0)" "todas as notificacoes com status ENVIADA ($(echo "$LISTA" | json 'd.length') no total)"

echo "7) RabbitMQ (interface de gerenciamento em $RABBITMQ)"
if curl -sf -u "$MQ_USER:$MQ_PASSWORD" "$RABBITMQ/api/overview" >/dev/null; then
  for fila in consulta-profissionais projeto.criado projeto.atualizado equipe.formada eventos-projetos eventos-notificacoes; do
    espera 15 "curl -s -u $MQ_USER:$MQ_PASSWORD $RABBITMQ/api/queues | node -e \"let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{const q=JSON.parse(s).find(q=>q.name==='$fila');process.exit(q&&q.messages===0?0:1)})\""
    estado=$(curl -s -u "$MQ_USER:$MQ_PASSWORD" "$RABBITMQ/api/queues" | json "(q=>q?('mensagens pendentes: '+q.messages+', consumidores: '+q.consumers):'')(d.find(q=>q.name==='$fila'))")
    confere "$(case "$estado" in *"pendentes: 0"*) echo 1;; *) echo 0;; esac)" "fila $fila ($estado)"
  done
else
  echo "  [PULADO] interface de gerenciamento indisponivel ou credenciais diferentes (ajuste MQ_USER/MQ_PASSWORD)"
fi

echo
if [ "$FALHAS" -eq 0 ]; then echo "RESULTADO: tudo certo."; else echo "RESULTADO: $FALHAS item(ns) com falha."; exit 1; fi
