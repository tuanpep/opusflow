package ops

import (
	"fmt"
	"path/filepath"
)

func GeneratePrompt(action, file string) (string, error) {
	// Ideally we resolve full path or relative to project root
	// For now we assume standard paths

	switch action {
	case "plan":
		return fmt.Sprintf("Read @opusflow-planning/plans/%s and fill in the details based on the user query.\n", filepath.Base(file)), nil
	case "execute":
		return fmt.Sprintf("Follow the plan in @opusflow-planning/plans/%s verbatim.\nExecute each step in order. After completion, run the verification commands.\n", filepath.Base(file)), nil
	case "verify":
		return fmt.Sprintf("Verify the implementation against the plan in @opusflow-planning/plans/%s.\nCheck each step was implemented correctly.\nReport any deviations using Critical/Major/Minor/Outdated categories.\n", filepath.Base(file)), nil
	default:
		return "", fmt.Errorf("unknown action: %s", action)
	}
}
