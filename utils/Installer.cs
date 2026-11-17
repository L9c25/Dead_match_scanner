using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;
using Microsoft.Win32;

namespace DeadlockScannerInstaller
{
    public class InstallerForm : Form
    {
        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblStatus;
        private ProgressBar progressBar;
        private Button btnInstall;
        private Button btnClose;
        private TextBox txtLog;

        public InstallerForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.lblTitle = new Label();
            this.lblSubtitle = new Label();
            this.lblStatus = new Label();
            this.progressBar = new ProgressBar();
            this.btnInstall = new Button();
            this.btnClose = new Button();
            this.txtLog = new TextBox();

            this.SuspendLayout();

            // Form
            this.Text = "Instalador - Deadlock Toolkit";
            this.Size = new Size(540, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(15, 20, 30);
            this.ForeColor = Color.FromArgb(240, 240, 240);
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            // Title
            this.lblTitle.Text = "🔮 DEADLOCK TOOLKIT";
            this.lblTitle.Font = new Font("Segoe UI", 14f, FontStyle.Bold);
            this.lblTitle.ForeColor = Color.FromArgb(246, 192, 66);
            this.lblTitle.Location = new Point(20, 18);
            this.lblTitle.Size = new Size(490, 30);

            // Subtitle
            this.lblSubtitle.Text = "Instalador automático para Adobe Premiere Pro (v25.4.0 / CC 2019+)";
            this.lblSubtitle.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            this.lblSubtitle.ForeColor = Color.FromArgb(160, 175, 200);
            this.lblSubtitle.Location = new Point(22, 50);
            this.lblSubtitle.Size = new Size(490, 22);

            // Status
            this.lblStatus.Text = "Clique em 'Instalar no Premiere Pro' para iniciar.";
            this.lblStatus.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            this.lblStatus.ForeColor = Color.FromArgb(220, 230, 245);
            this.lblStatus.Location = new Point(22, 85);
            this.lblStatus.Size = new Size(490, 22);

            // Progress Bar
            this.progressBar.Location = new Point(22, 112);
            this.progressBar.Size = new Size(480, 16);
            this.progressBar.Style = ProgressBarStyle.Continuous;

            // Log Box
            this.txtLog.Location = new Point(22, 140);
            this.txtLog.Size = new Size(480, 175);
            this.txtLog.Multiline = true;
            this.txtLog.ReadOnly = true;
            this.txtLog.ScrollBars = ScrollBars.Vertical;
            this.txtLog.BackColor = Color.FromArgb(10, 14, 22);
            this.txtLog.ForeColor = Color.FromArgb(180, 210, 240);
            this.txtLog.Font = new Font("Consolas", 9f);
            this.txtLog.BorderStyle = BorderStyle.FixedSingle;

            // Install Button
            this.btnInstall.Text = "⚡ Instalar no Premiere Pro";
            this.btnInstall.Location = new Point(22, 328);
            this.btnInstall.Size = new Size(260, 38);
            this.btnInstall.BackColor = Color.FromArgb(246, 192, 66);
            this.btnInstall.ForeColor = Color.FromArgb(15, 20, 30);
            this.btnInstall.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
            this.btnInstall.FlatStyle = FlatStyle.Flat;
            this.btnInstall.FlatAppearance.BorderSize = 0;
            this.btnInstall.Cursor = Cursors.Hand;
            this.btnInstall.Click += new EventHandler(this.BtnInstall_Click);

            // Close Button
            this.btnClose.Text = "Fechar";
            this.btnClose.Location = new Point(392, 328);
            this.btnClose.Size = new Size(110, 38);
            this.btnClose.BackColor = Color.FromArgb(30, 40, 60);
            this.btnClose.ForeColor = Color.White;
            this.btnClose.FlatStyle = FlatStyle.Flat;
            this.btnClose.FlatAppearance.BorderSize = 0;
            this.btnClose.Cursor = Cursors.Hand;
            this.btnClose.Click += new EventHandler((s, e) => this.Close());

            // Controls
            this.Controls.Add(this.lblTitle);
            this.Controls.Add(this.lblSubtitle);
            this.Controls.Add(this.lblStatus);
            this.Controls.Add(this.progressBar);
            this.Controls.Add(this.txtLog);
            this.Controls.Add(this.btnInstall);
            this.Controls.Add(this.btnClose);

            this.ResumeLayout(false);
        }

        private void AppendLog(string text)
        {
            this.txtLog.AppendText(text + Environment.NewLine);
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            this.btnInstall.Enabled = false;
            this.txtLog.Clear();
            this.progressBar.Value = 10;
            this.lblStatus.Text = "Instalando extensão...";

            try
            {
                string sourceDir = AppDomain.CurrentDomain.BaseDirectory;
                string pluginDir = Path.Combine(sourceDir, "com.deadlock.toolkit");
                if (!Directory.Exists(pluginDir))
                {
                    pluginDir = sourceDir;
                }

                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string targetDir = Path.Combine(appData, "Adobe", "CEP", "extensions", "com.deadlock.toolkit");

                AppendLog("▶ Diretório de Origem: " + pluginDir);
                AppendLog("▶ Diretório de Destino: " + targetDir);

                // 1. Create target directory
                if (!Directory.Exists(targetDir))
                {
                    Directory.CreateDirectory(targetDir);
                    AppendLog("✔ Pasta de extensões criada.");
                }

                this.progressBar.Value = 30;

                // 2. Copy files
                string[] dirsToCopy = new string[] { "CSXS", "host", "js", "css", "icons", "assets" };
                foreach (string dir in dirsToCopy)
                {
                    string srcSub = Path.Combine(pluginDir, dir);
                    string dstSub = Path.Combine(targetDir, dir);
                    if (Directory.Exists(srcSub))
                    {
                        CopyDirectory(srcSub, dstSub);
                        AppendLog("✔ Pasta '" + dir + "' copiada com sucesso.");
                    }
                }

                string[] filesToCopy = new string[] { "index.html" };
                foreach (string file in filesToCopy)
                {
                    string srcFile = Path.Combine(pluginDir, file);
                    string dstFile = Path.Combine(targetDir, file);
                    if (File.Exists(srcFile))
                    {
                        File.Copy(srcFile, dstFile, true);
                        AppendLog("✔ Arquivo '" + file + "' copiado.");
                    }
                }

                this.progressBar.Value = 70;

                // 3. Enable PlayerDebugMode in Windows Registry (CSXS.7 to CSXS.25)
                AppendLog("▶ Configurando chaves de registro (PlayerDebugMode)...");
                int regCount = 0;
                for (int v = 7; v <= 25; v++)
                {
                    try
                    {
                        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Adobe\CSXS." + v))
                        {
                            if (key != null)
                            {
                                key.SetValue("PlayerDebugMode", "1", RegistryValueKind.String);
                                regCount++;
                            }
                        }
                    }
                    catch { }
                }
                AppendLog("✔ PlayerDebugMode ativado para " + regCount + " versões do Adobe CSXS.");

                this.progressBar.Value = 100;
                this.lblStatus.Text = "✅ Instalação concluída com sucesso!";
                this.lblStatus.ForeColor = Color.FromArgb(74, 222, 128);

                AppendLog("");
                AppendLog("🎉 SUCESSO! A extensão já está disponível no Premiere Pro.");
                AppendLog("📌 Abra o Premiere Pro e acesse: Janela > Extensões > Deadlock Toolkit");

                MessageBox.Show(
                    "Extensão 'Deadlock Toolkit' instalada com sucesso no Adobe Premiere Pro!\n\n" +
                    "Como abrir no Premiere:\n" +
                    "1. Abra o Premiere Pro\n" +
                    "2. Menu superior: Janela > Extensões > Deadlock Toolkit\n" +
                    "(Window > Extensions > Deadlock Toolkit)",
                    "Instalação Concluída",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                this.lblStatus.Text = "❌ Erro durante a instalação.";
                this.lblStatus.ForeColor = Color.FromArgb(248, 113, 113);
                AppendLog("ERRO: " + ex.Message);
                MessageBox.Show("Erro ao instalar: " + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.btnInstall.Enabled = true;
            }
        }

        private static void CopyDirectory(string sourceDir, string destinationDir)
        {
            Directory.CreateDirectory(destinationDir);

            foreach (string file in Directory.GetFiles(sourceDir))
            {
                string targetFilePath = Path.Combine(destinationDir, Path.GetFileName(file));
                File.Copy(file, targetFilePath, true);
            }

            foreach (string subDir in Directory.GetDirectories(sourceDir))
            {
                string targetSubDirPath = Path.Combine(destinationDir, Path.GetFileName(subDir));
                CopyDirectory(subDir, targetSubDirPath);
            }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }
}
