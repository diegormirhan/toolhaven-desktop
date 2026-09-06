import { Download, HardDrive, ShieldCheck, X } from "lucide-react";
import type { InstallationPlanStep } from "../../../../scripts/component-installation/resolve-installation-plan.mjs";
import type { CatalogTool } from "../catalog/catalog";

type InstallDialogProps = {
  tool: CatalogTool;
  plan: InstallationPlanStep[];
  labelsById: Record<string, string>;
  onClose: () => void;
};

export function InstallDialog({ tool, plan, labelsById, onClose }: InstallDialogProps) {
  return (
    <div className="dialog-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title">
        <button className="icon-button install-dialog__close" type="button" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <div className="dialog-icon"><Download size={24} /></div>
        <h2 id="install-title">Instalar {tool.integrationName}</h2>
        <p className="install-dialog__lead">
          Este componente não foi detectado no host Windows. O plano abaixo mostra as dependências necessárias; o pacote só será instalado quando houver artefato versionado e hash publicado.
        </p>

        <div className="plan-list" aria-label="Plano de instalação">
          {plan.map((step, index) => (
            <div className="plan-step" key={step.toolId}>
              <span className="plan-step__index">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <strong>{labelsById[step.toolId]}</strong>
                <small>{step.reason === "dependency" ? "Dependência" : "Ferramenta solicitada"}</small>
              </span>
            </div>
          ))}
        </div>

        <div className="dialog-assurances">
          <span><ShieldCheck size={16} /> Hash verificado antes de ativar</span>
          <span><HardDrive size={16} /> Instalação isolada por versão</span>
        </div>
        <div className="dialog-actions">
          <button className="button button--primary" type="button" onClick={onClose}>Fechar plano</button>
        </div>
      </section>
    </div>
  );
}
