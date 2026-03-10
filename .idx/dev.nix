# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-23.11"; # or "unstable"
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
  ];
  # Sets environment variables in the workspace
  env = {};
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "google.gemini-cli-vscode-ide-companion"
    ];
    workspace = {
      # Runs when a workspace is first created with this `dev.nix` file
      onCreate = {
        npm-install = "npm ci --no-audit --prefer-offline --no-progress --timing";
      };
      # Runs when a workspace is (re)started
      onStart= {
        run-server = "npm run dev";
      };
    };
    # NOTE: This is an excerpt of a complete Nix configuration example.
    # For more information about the dev.nix file in Firebase Studio, see
    # https://firebase.google.com/docs/studio/customize-workspace

    # Enable previews and customize configuration
    previews = {
      enable = true;
      previews = {
        # The following object sets web previews
        web = {
          command = [
            "npm"
            "run"
            "dev"
          ];
          manager = "web";
          cwd = "/home/user/muvmnt-staffing/web";
          # Optionally, specify a directory that contains your web app
          # cwd = "app/client";
        };
      };
    };
  };
}