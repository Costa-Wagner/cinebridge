import { RegistroPrototipos } from "./RegistroPrototipos";
import { ProjetoDocumentario } from "../entities/ProjetoDocumentario";
import { Papel } from "../enums/Papel";

function modelo(): ProjetoDocumentario {
  const p = new ProjetoDocumentario();
  p.genero = "Documentario";
  p.tema = "Modelo";
  p.entrevistados = [];
  p.papeisObrigatorios = [{ papel: Papel.DIRETOR, peso: 10 }];
  return p;
}

describe("RegistroPrototipos", () => {
  it("entrega uma copia do prototipo registrado, nunca a propria instancia", () => {
    const registro = new RegistroPrototipos();
    const prototipo = modelo();
    registro.registrar("doc-padrao", prototipo);

    const a = registro.criar("doc-padrao") as ProjetoDocumentario;
    const b = registro.criar("doc-padrao") as ProjetoDocumentario;
    a.tema = "Alterado";

    expect(a).not.toBe(prototipo);
    expect(a).not.toBe(b);
    expect(b.tema).toBe("Modelo");
    expect(prototipo.tema).toBe("Modelo");
  });

  it("lista os nomes registrados", () => {
    const registro = new RegistroPrototipos();
    registro.registrar("doc-padrao", modelo());

    expect(registro.nomes()).toEqual(["doc-padrao"]);
  });

  it("falha ao criar a partir de um nome nao registrado", () => {
    expect(() => new RegistroPrototipos().criar("inexistente")).toThrow(
      "Prototipo nao registrado: inexistente"
    );
  });
});
